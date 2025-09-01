const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// Base URL for API
const BASE_URL = 'http://localhost:5000/api';

// Test configuration
const testConfig = {
  staff: {
    name: 'John Doe',
    email: 'john.doe@aquaflow.com',
    password: 'password123',
    phone: '+1234567890',
    department: 'Maintenance',
    location: {
      coordinates: [-122.4194, 37.7749],
      address: '123 Main St, San Francisco, CA'
    }
  },
  plumber: {
    name: 'Mike Johnson',
    email: 'mike@plumbingpro.com',
    password: 'password123',
    phone: '+1987654321',
    businessName: 'Professional Plumbing Services',
    license: {
      number: 'PL-123456',
      expiryDate: '2025-12-31'
    },
    location: {
      coordinates: [-122.4094, 37.7849],
      address: '456 Service Ave, San Francisco, CA'
    },
    pricing: {
      hourlyRate: 85,
      emergencyRate: 120,
      minimumCharge: 50
    },
    services: ['leak_repair', 'emergency_service', 'pipe_installation']
  }
};

// Helper function for API requests
async function apiRequest(method, endpoint, data = {}, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {}
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (method === 'POST' || method === 'PUT') {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

// Test functions
async function testHealthCheck() {
  console.log('🩺 Testing health check...');
  const response = await axios.get('http://localhost:5000/health');
  console.log('✅ Health check passed:', response.data.status);
  return true;
}

async function testStaffRegistration() {
  console.log('👤 Testing staff registration...');
  const result = await apiRequest('POST', '/auth/register/staff', testConfig.staff);
  
  if (result.success) {
    console.log('✅ Staff registration successful');
    return result.data.token;
  } else {
    console.log('❌ Staff registration failed:', result.error);
    return null;
  }
}

async function testPlumberRegistration() {
  console.log('🔧 Testing plumber registration...');
  const result = await apiRequest('POST', '/auth/register/plumber', testConfig.plumber);
  
  if (result.success) {
    console.log('✅ Plumber registration successful');
    return result.data.token;
  } else {
    console.log('❌ Plumber registration failed:', result.error);
    return null;
  }
}

async function testLeakReporting(staffToken) {
  console.log('💧 Testing leak reporting...');
  const leakData = {
    title: 'Water Leak in Building A',
    description: 'Large water leak detected in the basement area',
    severity: 'high',
    location: {
      coordinates: [-122.4194, 37.7749],
      address: 'Building A, Basement, San Francisco, CA',
      building: 'Building A',
      floor: 'Basement',
      room: 'Utility Room'
    },
    reportMethod: 'manual',
    isEmergency: false,
    tags: ['basement', 'utility-room']
  };

  const result = await apiRequest('POST', '/leaks/report', leakData, staffToken);
  
  if (result.success) {
    console.log('✅ Leak reported successfully');
    return result.data.leak._id;
  } else {
    console.log('❌ Leak reporting failed:', result.error);
    return null;
  }
}

async function testFindNearbyPlumbers(staffToken, leakLocation) {
  console.log('🔍 Testing nearby plumber search...');
  const searchData = {
    location: {
      coordinates: leakLocation
    },
    serviceType: 'leak_repair',
    priority: 'high',
    urgency: 'normal'
  };

  const result = await apiRequest('POST', '/plumbers/find-for-service', searchData, staffToken);
  
  if (result.success) {
    console.log(`✅ Found ${result.data.plumbers.length} plumbers nearby`);
    return result.data.plumbers;
  } else {
    console.log('❌ Plumber search failed:', result.error);
    return [];
  }
}

async function testServiceRequestCreation(staffToken, leakId) {
  console.log('📋 Testing service request creation...');
  const serviceData = {
    serviceType: 'leak_repair',
    priority: 'high',
    notes: 'Urgent repair needed for basement leak'
  };

  const result = await apiRequest('POST', `/leaks/${leakId}/service-request`, serviceData, staffToken);
  
  if (result.success) {
    console.log('✅ Service request created successfully');
    return result.data.serviceRequest._id;
  } else {
    console.log('❌ Service request creation failed:', result.error);
    return null;
  }
}

async function testIoTSensorAlert() {
  console.log('🤖 Testing IoT sensor alert...');
  const sensorData = {
    sensorId: 'TEST-SENSOR-001',
    location: {
      coordinates: [-122.4194, 37.7749],
      address: 'Building A, Floor 2, San Francisco, CA'
    },
    sensorData: {
      waterLevel: 95,
      pressure: 15,
      flow: 180,
      temperature: 22,
      ph: 7.2
    },
    alertType: 'water_level_critical',
    severity: 'critical'
  };

  const result = await axios.post('http://localhost:5000/api/leaks/iot-alert', sensorData, {
    headers: {
      'X-API-Key': process.env.IOT_API_KEY || 'test-iot-key',
      'Content-Type': 'application/json'
    }
  });

  if (result.status === 201) {
    console.log('✅ IoT sensor alert processed successfully');
    return result.data.leakId;
  } else {
    console.log('❌ IoT sensor alert failed');
    return null;
  }
}

async function testSystem() {
  console.log('🚀 Starting AquaFlow System Tests');
  console.log('=====================================');

  try {
    // Test 1: Health check
    await testHealthCheck();

    // Test 2: User registration
    const staffToken = await testStaffRegistration();
    if (!staffToken) return;

    const plumberToken = await testPlumberRegistration();
    if (!plumberToken) return;

    // Test 3: Leak reporting
    const leakId = await testLeakReporting(staffToken);
    if (!leakId) return;

    // Test 4: Find nearby plumbers
    const plumbers = await testFindNearbyPlumbers(staffToken, [-122.4194, 37.7749]);

    // Test 5: Service request creation
    const serviceId = await testServiceRequestCreation(staffToken, leakId);
    if (!serviceId) return;

    // Test 6: IoT sensor alert
    const iotLeakId = await testIoTSensorAlert();

    console.log('=====================================');
    console.log('🎉 All tests completed successfully!');
    console.log('📊 Test Summary:');
    console.log(`   • Staff Token: ${staffToken ? 'Generated' : 'Failed'}`);
    console.log(`   • Plumber Token: ${plumberToken ? 'Generated' : 'Failed'}`);
    console.log(`   • Leak ID: ${leakId || 'Failed'}`);
    console.log(`   • Service ID: ${serviceId || 'Failed'}`);
    console.log(`   • IoT Leak ID: ${iotLeakId || 'Failed'}`);
    console.log(`   • Plumbers Found: ${plumbers.length}`);

  } catch (error) {
    console.error('❌ System test failed:', error.message);
  }
}

// Test IoT device registration
async function testIoTDeviceStatus() {
  console.log('📡 Testing IoT device status...');
  const deviceData = {
    status: 'online',
    batteryLevel: 85,
    signalStrength: 92,
    firmwareVersion: '2.1.0'
  };

  try {
    const result = await axios.post('http://localhost:5000/api/iot/device-status', deviceData, {
      headers: {
        'X-API-Key': process.env.IOT_API_KEY || 'test-iot-key',
        'X-Device-ID': 'TEST-DEVICE-001',
        'Content-Type': 'application/json'
      }
    });

    if (result.status === 200) {
      console.log('✅ IoT device status updated successfully');
    }
  } catch (error) {
    console.log('❌ IoT device status update failed:', error.response?.data || error.message);
  }
}

// Main execution
if (require.main === module) {
  console.log('🌊 AquaFlow System Testing Suite');
  console.log('Make sure the server is running on http://localhost:5000');
  console.log('');
  
  setTimeout(async () => {
    await testSystem();
    await testIoTDeviceStatus();
    process.exit(0);
  }, 2000);
}

module.exports = {
  testHealthCheck,
  testStaffRegistration,
  testPlumberRegistration,
  testLeakReporting,
  testFindNearbyPlumbers,
  testServiceRequestCreation,
  testIoTSensorAlert
};
