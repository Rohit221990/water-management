import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from './auth.js';
import Leak from '../models/Leak.js';
import User from '../models/User.js';
import ServiceRequest from '../models/ServiceRequest.js';


const router = express.Router();

// Middleware to authenticate IoT devices
const authenticateIOT = (req, res, next) => {
  const apiKey = req.header('X-API-Key');
  const deviceId = req.header('X-Device-ID');
  
  if (!apiKey || apiKey !== process.env.IOT_API_KEY) {
    return res.status(401).json({ message: 'Invalid API key' });
  }

  if (!deviceId) {
    return res.status(400).json({ message: 'Device ID required' });
  }

  req.deviceId = deviceId;
  next();
};

// @route   POST /api/iot/sensor-data
// @desc    Receive sensor data from IoT devices
// @access  IoT devices only
router.post('/sensor-data', authenticateIOT, [
  body('sensorId').notEmpty().withMessage('Sensor ID is required'),
  body('location.coordinates').isArray({ min: 2, max: 2 }).withMessage('Valid coordinates required'),
  body('location.address').notEmpty().withMessage('Address is required'),
  body('sensorData').isObject().withMessage('Sensor data object is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      sensorId,
      location,
      sensorData,
      timestamp,
      alertType = 'data_reading',
      forceAlert = false
    } = req.body;

    // Validate sensor data structure
    const requiredFields = ['waterLevel', 'pressure', 'flow', 'temperature'];
    const hasRequiredData = requiredFields.some(field => sensorData.hasOwnProperty(field));
    
    if (!hasRequiredData) {
      return res.status(400).json({ 
        message: 'Sensor data must include at least one of: waterLevel, pressure, flow, temperature' 
      });
    }

    // Analyze sensor data for anomalies
    const analysis = analyzeSensorData(sensorData);
    
    // Log sensor reading (you might want to store this in a separate collection)
    console.log(`Sensor ${sensorId} data:`, {
      timestamp: timestamp || new Date(),
      location: location,
      data: sensorData,
      analysis: analysis
    });

    // Check if alert needs to be triggered
    if (analysis.alertRequired || forceAlert) {
      await handleSensorAlert(sensorId, location, sensorData, analysis, alertType);
    }

    // Emit real-time data to connected staff
    const io = req.app.get('io');
    io.to('staff-room').emit('sensor-data-update', {
      sensorId,
      location,
      sensorData,
      analysis,
      timestamp: timestamp || new Date()
    });

    res.json({
      message: 'Sensor data received successfully',
      sensorId,
      analysis,
      alertTriggered: analysis.alertRequired || forceAlert
    });

  } catch (error) {
    console.error('Sensor data processing error:', error);
    res.status(500).json({ message: 'Server error while processing sensor data' });
  }
});

// Function to analyze sensor data for anomalies
function analyzeSensorData(sensorData) {
  const analysis = {
    alertRequired: false,
    severity: 'low',
    anomalies: [],
    recommendations: []
  };

  // Water level analysis
  if (sensorData.waterLevel !== undefined) {
    if (sensorData.waterLevel > 90) {
      analysis.alertRequired = true;
      analysis.severity = 'critical';
      analysis.anomalies.push('Critical water level detected');
      analysis.recommendations.push('Immediate water shutoff required');
    } else if (sensorData.waterLevel > 70) {
      analysis.alertRequired = true;
      analysis.severity = 'high';
      analysis.anomalies.push('High water level detected');
      analysis.recommendations.push('Monitor closely and prepare for potential leak');
    } else if (sensorData.waterLevel > 50) {
      analysis.severity = 'medium';
      analysis.anomalies.push('Elevated water level');
      analysis.recommendations.push('Check for minor leaks or blockages');
    }
  }

  // Flow analysis
  if (sensorData.flow !== undefined) {
    if (sensorData.flow > 150) {
      analysis.alertRequired = true;
      analysis.severity = analysis.severity === 'critical' ? 'critical' : 'high';
      analysis.anomalies.push('Abnormally high water flow detected');
      analysis.recommendations.push('Check for major pipe leaks or breaks');
    } else if (sensorData.flow > 100) {
      analysis.alertRequired = true;
      analysis.severity = analysis.severity === 'critical' ? 'critical' : 'medium';
      analysis.anomalies.push('High water flow detected');
      analysis.recommendations.push('Investigate potential leak sources');
    } else if (sensorData.flow < 5 && sensorData.flow > 0) {
      analysis.anomalies.push('Low water flow detected');
      analysis.recommendations.push('Check for blockages or valve issues');
    }
  }

  // Pressure analysis
  if (sensorData.pressure !== undefined) {
    if (sensorData.pressure > 80) {
      analysis.anomalies.push('High pressure detected');
      analysis.recommendations.push('Check pressure regulators and relief valves');
    } else if (sensorData.pressure < 20) {
      analysis.alertRequired = true;
      analysis.severity = analysis.severity === 'critical' ? 'critical' : 'medium';
      analysis.anomalies.push('Low pressure detected');
      analysis.recommendations.push('Check for leaks or supply issues');
    }
  }

  // Temperature analysis
  if (sensorData.temperature !== undefined) {
    if (sensorData.temperature > 60) {
      analysis.anomalies.push('High water temperature detected');
      analysis.recommendations.push('Check water heater and hot water system');
    } else if (sensorData.temperature < 5) {
      analysis.alertRequired = true;
      analysis.anomalies.push('Risk of pipe freezing detected');
      analysis.recommendations.push('Implement freeze prevention measures');
    }
  }

  // pH analysis (if available)
  if (sensorData.ph !== undefined) {
    if (sensorData.ph < 6.5 || sensorData.ph > 8.5) {
      analysis.anomalies.push('Water pH outside normal range');
      analysis.recommendations.push('Check water quality and treatment systems');
    }
  }

  return analysis;
}

// Function to handle sensor alerts
async function handleSensorAlert(sensorId, location, sensorData, analysis, alertType) {
  try {
    // Find a system user to report the leak
    const systemUser = await User.findOne({ role: 'admin' }) || await User.findOne();
    
    if (!systemUser) {
      console.error('No system user found to report IoT alert');
      return;
    }

    // Create leak report
    const leak = new Leak({
      title: `IoT Sensor Alert - ${alertType}`,
      description: `Automated alert from sensor ${sensorId}. Anomalies detected: ${analysis.anomalies.join(', ')}`,
      severity: analysis.severity,
      location,
      reportedBy: systemUser._id,
      reportMethod: 'iot_sensor',
      sensorData: {
        sensorId,
        ...sensorData,
        lastReading: new Date(),
        alertThreshold: getAlertThreshold(analysis.severity)
      },
      isEmergency: analysis.severity === 'critical',
      tags: ['iot-alert', 'sensor-detected']
    });

    await leak.calculatePriority();
    await leak.save();

    // Emit real-time alert
    const io = req.app.get('io');
    io.to('staff-room').emit('iot-leak-alert', {
      leak: leak,
      sensorId: sensorId,
      alertType: alertType,
      analysis: analysis,
      timestamp: new Date()
    });

    // Auto-create emergency service request for critical alerts
    if (analysis.severity === 'critical') {
      const serviceRequest = new ServiceRequest({
        leak: leak._id,
        requestedBy: systemUser._id,
        serviceType: 'emergency_service',
        priority: 'emergency',
        location: location,
        status: 'plumber_search'
      });

      await serviceRequest.save();
      
      leak.assignedService = serviceRequest._id;
      leak.status = 'assigned';
      await leak.save();

      io.to('plumber-room').emit('emergency-service-request', {
        serviceRequest: serviceRequest,
        leak: leak,
        sensorData: sensorData
      });
    }

    console.log(`IoT alert processed for sensor ${sensorId}: ${analysis.severity} severity`);

  } catch (error) {
    console.error('Error handling sensor alert:', error);
  }
}

// Function to get alert threshold based on severity
function getAlertThreshold(severity) {
  switch (severity) {
    case 'critical':
      return 95;
    case 'high':
      return 80;
    case 'medium':
      return 60;
    default:
      return 40;
  }
}

// @route   POST /api/iot/device-status
// @desc    Update device status and heartbeat
// @access  IoT devices only
router.post('/device-status', authenticateIOT, [
  body('status').isIn(['online', 'offline', 'maintenance', 'error']).withMessage('Valid status required'),
  body('batteryLevel').optional().isNumeric(),
  body('signalStrength').optional().isNumeric(),
  body('lastMaintenance').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      status,
      batteryLevel,
      signalStrength,
      lastMaintenance,
      errorMessage,
      firmwareVersion
    } = req.body;

    // Log device status (you might want to store this in a separate devices collection)
    const deviceStatus = {
      deviceId: req.deviceId,
      status,
      batteryLevel,
      signalStrength,
      lastMaintenance,
      errorMessage,
      firmwareVersion,
      lastSeen: new Date()
    };

    console.log(`Device ${req.deviceId} status update:`, deviceStatus);

    // Emit device status to staff
    const io = req.app.get('io');
    io.to('staff-room').emit('device-status-update', deviceStatus);

    // Check for device issues
    if (status === 'error' || (batteryLevel && batteryLevel < 20)) {
      io.to('staff-room').emit('device-alert', {
        deviceId: req.deviceId,
        alert: status === 'error' ? 'Device error reported' : 'Low battery warning',
        severity: status === 'error' ? 'high' : 'medium',
        details: {
          errorMessage,
          batteryLevel,
          signalStrength
        }
      });
    }

    res.json({
      message: 'Device status updated successfully',
      deviceId: req.deviceId,
      status: status,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Device status update error:', error);
    res.status(500).json({ message: 'Server error while updating device status' });
  }
});

// @route   GET /api/iot/devices
// @desc    Get IoT device list and status
// @access  Private (Staff only)
router.get('/devices', authenticateToken, async (req, res) => {
  try {
    if (req.userType !== 'staff') {
      return res.status(403).json({ message: 'Only staff can view device information' });
    }

    // This is a mock implementation - you'd typically store device info in a database
    const mockDevices = [
      {
        deviceId: 'IOT-SENSOR-001',
        name: 'Main Building Water Sensor',
        location: { address: 'Building A, Floor 1', coordinates: [-122.4194, 37.7749] },
        status: 'online',
        batteryLevel: 85,
        signalStrength: 92,
        lastSeen: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        firmwareVersion: '2.1.0'
      },
      {
        deviceId: 'IOT-SENSOR-002',
        name: 'Basement Water Monitor',
        location: { address: 'Building A, Basement', coordinates: [-122.4195, 37.7748] },
        status: 'online',
        batteryLevel: 67,
        signalStrength: 78,
        lastSeen: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        firmwareVersion: '2.1.0'
      },
      {
        deviceId: 'IOT-SENSOR-003',
        name: 'Roof Water Tank Sensor',
        location: { address: 'Building A, Roof', coordinates: [-122.4193, 37.7750] },
        status: 'maintenance',
        batteryLevel: 23,
        signalStrength: 65,
        lastSeen: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        firmwareVersion: '2.0.5'
      }
    ];

    res.json({
      devices: mockDevices,
      summary: {
        total: mockDevices.length,
        online: mockDevices.filter(d => d.status === 'online').length,
        offline: mockDevices.filter(d => d.status === 'offline').length,
        maintenance: mockDevices.filter(d => d.status === 'maintenance').length,
        lowBattery: mockDevices.filter(d => d.batteryLevel && d.batteryLevel < 30).length
      }
    });

  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ message: 'Server error while fetching devices' });
  }
});

// @route   GET /api/iot/sensor-history/:sensorId
// @desc    Get historical sensor data
// @access  Private (Staff only)
router.get('/sensor-history/:sensorId', authenticateToken, async (req, res) => {
  try {
    if (req.userType !== 'staff') {
      return res.status(403).json({ message: 'Only staff can view sensor history' });
    }

    const { sensorId } = req.params;
    const { hours = 24 } = req.query;

    // Get leaks created by this sensor in the specified time period
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const sensorLeaks = await Leak.find({
      'sensorData.sensorId': sensorId,
      createdAt: { $gte: startTime }
    }).sort({ createdAt: -1 });

    // Mock historical sensor data (in a real implementation, you'd store this separately)
    const mockHistoricalData = [];
    for (let i = 0; i < hours; i++) {
      const timestamp = new Date(Date.now() - i * 60 * 60 * 1000);
      mockHistoricalData.push({
        timestamp,
        sensorData: {
          waterLevel: Math.floor(Math.random() * 30) + 20, // 20-50
          pressure: Math.floor(Math.random() * 40) + 40, // 40-80
          flow: Math.floor(Math.random() * 20) + 10, // 10-30
          temperature: Math.floor(Math.random() * 10) + 18, // 18-28
          ph: (Math.random() * 2 + 6.5).toFixed(1) // 6.5-8.5
        }
      });
    }

    res.json({
      sensorId,
      period: `${hours} hours`,
      historicalData: mockHistoricalData.reverse(),
      alerts: sensorLeaks,
      summary: {
        totalReadings: mockHistoricalData.length,
        alertsTriggered: sensorLeaks.length,
        lastReading: mockHistoricalData[mockHistoricalData.length - 1]?.timestamp,
        averageWaterLevel: mockHistoricalData.reduce((sum, d) => sum + d.sensorData.waterLevel, 0) / mockHistoricalData.length
      }
    });

  } catch (error) {
    console.error('Get sensor history error:', error);
    res.status(500).json({ message: 'Server error while fetching sensor history' });
  }
});

// @route   POST /api/iot/calibrate/:deviceId
// @desc    Send calibration command to IoT device
// @access  Private (Admin only)
router.post('/calibrate/:deviceId', authenticateToken, [
  body('calibrationData').isObject().withMessage('Calibration data object required')
], async (req, res) => {
  try {
    if (req.userType !== 'staff' || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can calibrate devices' });
    }

    const { deviceId } = req.params;
    const { calibrationData, notes } = req.body;

    // Mock calibration command (in a real implementation, you'd send this to the device)
    console.log(`Calibration command sent to device ${deviceId}:`, calibrationData);

    // Log calibration activity
    const calibrationLog = {
      deviceId,
      calibrationData,
      notes,
      performedBy: req.user._id,
      timestamp: new Date()
    };

    // Emit calibration status
    const io = req.app.get('io');
    io.to('staff-room').emit('device-calibration', {
      deviceId,
      status: 'initiated',
      performedBy: req.user.name,
      timestamp: new Date()
    });

    res.json({
      message: 'Calibration command sent successfully',
      deviceId,
      calibrationId: `CAL-${Date.now()}`,
      status: 'initiated'
    });

  } catch (error) {
    console.error('Device calibration error:', error);
    res.status(500).json({ message: 'Server error while calibrating device' });
  }
});

// @route   GET /api/iot/analytics
// @desc    Get IoT analytics and insights
// @access  Private (Staff only)
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    if (req.userType !== 'staff') {
      return res.status(403).json({ message: 'Only staff can view IoT analytics' });
    }

    const { period = '7' } = req.query; // Default to last 7 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get IoT-related leak statistics
    const iotLeaks = await Leak.countDocuments({
      reportMethod: 'iot_sensor',
      createdAt: { $gte: startDate }
    });

    const totalLeaks = await Leak.countDocuments({
      createdAt: { $gte: startDate }
    });

    const criticalIotAlerts = await Leak.countDocuments({
      reportMethod: 'iot_sensor',
      severity: 'critical',
      createdAt: { $gte: startDate }
    });

    // Mock analytics data
    const analytics = {
      period: `${period} days`,
      summary: {
        totalIoTAlerts: iotLeaks,
        totalLeaks: totalLeaks,
        iotDetectionRate: totalLeaks > 0 ? Math.round((iotLeaks / totalLeaks) * 100) : 0,
        criticalAlertsDetected: criticalIotAlerts,
        averageResponseTime: '12 minutes',
        falsePositiveRate: '3.2%'
      },
      sensorPerformance: [
        { sensorId: 'IOT-SENSOR-001', uptime: 99.2, alertsGenerated: 5, accuracy: 94.5 },
        { sensorId: 'IOT-SENSOR-002', uptime: 98.8, alertsGenerated: 3, accuracy: 96.2 },
        { sensorId: 'IOT-SENSOR-003', uptime: 87.1, alertsGenerated: 8, accuracy: 89.3 }
      ],
      trendsAndInsights: [
        'Water pressure anomalies peak between 2-4 AM',
        'Basement sensors show 23% more activity during rainy season',
        'Temperature-related alerts increased by 15% this month',
        'Sensor IOT-SENSOR-003 requires maintenance - accuracy declining'
      ]
    };

    res.json({ analytics });

  } catch (error) {
    console.error('Get IoT analytics error:', error);
    res.status(500).json({ message: 'Server error while fetching IoT analytics' });
  }
});

export default router;
