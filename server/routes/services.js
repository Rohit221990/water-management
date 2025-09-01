import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from './auth.js';
import ServiceRequest from '../models/ServiceRequest.js';
import Plumber from '../models/Plumber.js';
import Leak from '../models/Leak.js';
import User from '../models/User.js';


const router = express.Router();

// @route   GET /api/services
// @desc    Get service requests with filters
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      status,
      priority,
      serviceType,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query based on user type
    let query = {};
    
    if (req.userType === 'plumber') {
      // Plumbers see requests assigned to them or nearby emergency requests
      query = {
        $or: [
          { assignedPlumber: req.user._id },
          { 
            priority: 'emergency',
            status: { $in: ['pending', 'plumber_search'] },
            location: {
              $near: {
                $geometry: {
                  type: 'Point',
                  coordinates: req.user.location.coordinates
                },
                $maxDistance: req.user.location.serviceRadius * 1000
              }
            }
          }
        ]
      };
    }

    // Apply additional filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (serviceType) query.serviceType = serviceType;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const services = await ServiceRequest.find(query)
      .populate('leak', 'title severity location description')
      .populate('requestedBy', 'name email phone department')
      .populate('assignedPlumber', 'name businessName phone rating location')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ServiceRequest.countDocuments(query);

    res.json({
      services,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ message: 'Server error while fetching services' });
  }
});

// @route   GET /api/services/:id
// @desc    Get service request by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const service = await ServiceRequest.findById(req.params.id)
      .populate('leak')
      .populate('requestedBy', 'name email phone department')
      .populate('assignedPlumber', 'name businessName phone rating location services')
      .populate('timeline.updatedBy', 'name email')
      .populate('communication.from', 'name email');

    if (!service) {
      return res.status(404).json({ message: 'Service request not found' });
    }

    // Check permissions
    if (req.userType === 'plumber' && 
        service.assignedPlumber && 
        service.assignedPlumber._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this service request' });
    }

    res.json({ service });

  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ message: 'Server error while fetching service' });
  }
});

// @route   POST /api/services/:id/accept
// @desc    Plumber accepts a service request
// @access  Private (Plumber only)
router.post('/:id/accept', authenticateToken, [
  body('estimatedArrival').optional().isISO8601().withMessage('Valid arrival time required'),
  body('message').optional().isString()
], async (req, res) => {
  try {
    if (req.userType !== 'plumber') {
      return res.status(403).json({ message: 'Only plumbers can accept service requests' });
    }

    const { estimatedArrival, message } = req.body;
    
    const service = await ServiceRequest.findById(req.params.id)
      .populate('leak');

    if (!service) {
      return res.status(404).json({ message: 'Service request not found' });
    }

    if (service.assignedPlumber) {
      return res.status(400).json({ message: 'Service request already assigned' });
    }

    if (!req.user.availability.isAvailable) {
      return res.status(400).json({ message: 'Plumber is not available' });
    }

    // Assign plumber to service request
    const arrivalTime = estimatedArrival ? new Date(estimatedArrival) : 
                        new Date(Date.now() + 60 * 60 * 1000); // 1 hour default

    await service.assignPlumber(req.user._id, arrivalTime);

    if (message) {
      await service.addMessage(req.user._id, 'Plumber', message);
    }

    // Update leak status
    const leak = await Leak.findById(service.leak._id);
    if (leak) {
      await leak.updateStatus('in_progress', req.user._id, 'Plumber', 'Plumber assigned and accepted');
    }

    // Emit real-time updates
    const io = req.app.get('io');
    io.to(`staff-${service.requestedBy}`).emit('service-accepted', {
      serviceId: service._id,
      plumber: {
        name: req.user.name,
        businessName: req.user.businessName,
        phone: req.user.phone,
        rating: req.user.rating
      },
      estimatedArrival: arrivalTime,
      message: message
    });

    res.json({
      message: 'Service request accepted successfully',
      service: service,
      estimatedArrival: arrivalTime
    });

  } catch (error) {
    console.error('Accept service error:', error);
    res.status(500).json({ message: 'Server error while accepting service' });
  }
});

// @route   PUT /api/services/:id/status
// @desc    Update service request status
// @access  Private
router.put('/:id/status', authenticateToken, [
  body('status').isIn([
    'pending', 'plumber_search', 'plumber_assigned', 'plumber_confirmed',
    'plumber_en_route', 'plumber_arrived', 'work_in_progress', 
    'work_completed', 'verified', 'closed', 'cancelled'
  ]).withMessage('Valid status required'),
  body('notes').optional().isString(),
  body('location').optional().isArray()
], async (req, res) => {
  try {
    const { status, notes, location } = req.body;
    
    const service = await ServiceRequest.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service request not found' });
    }

    // Check permissions
    if (req.userType === 'plumber' && 
        service.assignedPlumber && 
        service.assignedPlumber.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this service' });
    }

    // Update status
    await service.updateStatus(status, req.user._id, req.userType, notes, location);

    // Handle specific status updates
    if (status === 'work_completed' && req.userType === 'plumber') {
      // Update plumber stats
      const plumber = await Plumber.findById(req.user._id);
      if (plumber) {
        plumber.completedJobs += 1;
        await plumber.save();
      }

      // Notify staff for verification
      const io = req.app.get('io');
      io.to(`staff-${service.requestedBy}`).emit('work-completed', {
        serviceId: service._id,
        plumber: req.user.name,
        timestamp: new Date()
      });
    }

    if (status === 'verified' && req.userType === 'staff') {
      // Mark leak as resolved
      const leak = await Leak.findById(service.leak);
      if (leak) {
        await leak.updateStatus('resolved', req.user._id, 'User', 'Work verified and completed');
      }
    }

    res.json({
      message: 'Service status updated successfully',
      service: service
    });

  } catch (error) {
    console.error('Update service status error:', error);
    res.status(500).json({ message: 'Server error while updating service status' });
  }
});

// @route   POST /api/services/:id/work-details
// @desc    Add work details and completion info
// @access  Private (Plumber only)
router.post('/:id/work-details', authenticateToken, [
  body('diagnosis').notEmpty().withMessage('Diagnosis is required'),
  body('workPerformed').notEmpty().withMessage('Work performed description is required'),
  body('laborHours').isNumeric().withMessage('Labor hours must be a number'),
  body('materialsUsed').optional().isArray()
], async (req, res) => {
  try {
    if (req.userType !== 'plumber') {
      return res.status(403).json({ message: 'Only plumbers can add work details' });
    }

    const {
      diagnosis,
      workPerformed,
      materialsUsed,
      laborHours,
      beforePhotos,
      afterPhotos,
      notes,
      laborCost,
      materialsCost,
      additionalCharges
    } = req.body;
    
    const service = await ServiceRequest.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service request not found' });
    }

    if (service.assignedPlumber.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this service' });
    }

    // Update work details
    service.workDetails = {
      diagnosis,
      workPerformed,
      materialsUsed: materialsUsed || [],
      laborHours,
      beforePhotos: beforePhotos || [],
      afterPhotos: afterPhotos || [],
      notes: notes || ''
    };

    // Update pricing
    const plumber = await Plumber.findById(req.user._id);
    const baseLaborCost = laborHours * plumber.pricing.hourlyRate;
    
    service.pricing.laborCost = laborCost || baseLaborCost;
    service.pricing.materialsCost = materialsCost || 0;
    service.pricing.additionalCharges = additionalCharges || [];
    service.pricing.isEmergencyRate = service.priority === 'emergency';

    // Calculate total
    await service.calculateTotal();

    // Update status to work completed
    await service.updateStatus('work_completed', req.user._id, 'Plumber', 'Work details added and marked complete');

    res.json({
      message: 'Work details added successfully',
      service: service
    });

  } catch (error) {
    console.error('Add work details error:', error);
    res.status(500).json({ message: 'Server error while adding work details' });
  }
});

// @route   POST /api/services/:id/verify
// @desc    Staff verifies completed work
// @access  Private (Staff only)
router.post('/:id/verify', authenticateToken, [
  body('passed').isBoolean().withMessage('Quality check result required'),
  body('notes').optional().isString(),
  body('issues').optional().isArray()
], async (req, res) => {
  try {
    if (req.userType !== 'staff') {
      return res.status(403).json({ message: 'Only staff can verify work' });
    }

    const { passed, notes, issues, rating, feedback } = req.body;
    
    const service = await ServiceRequest.findById(req.params.id)
      .populate('assignedPlumber');

    if (!service) {
      return res.status(404).json({ message: 'Service request not found' });
    }

    if (service.status !== 'work_completed') {
      return res.status(400).json({ message: 'Work must be completed before verification' });
    }

    // Update verification details
    service.verification.staffVerified = {
      verified: true,
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
      notes: notes || ''
    };

    service.verification.qualityCheck = {
      passed,
      checkedBy: req.user._id,
      checkedAt: new Date(),
      issues: issues || [],
      notes: notes || ''
    };

    // Add staff rating
    if (rating && feedback) {
      service.rating.staffRating = {
        score: rating,
        feedback,
        ratedAt: new Date()
      };

      // Update plumber rating
      const plumber = await Plumber.findById(service.assignedPlumber._id);
      if (plumber) {
        await plumber.updateRating(rating);
      }
    }

    // Update status based on quality check
    const newStatus = passed ? 'verified' : 'work_in_progress';
    await service.updateStatus(newStatus, req.user._id, 'User', 
      passed ? 'Work verified successfully' : 'Work needs revision');

    // If verified, mark leak as resolved
    if (passed) {
      const leak = await Leak.findById(service.leak);
      if (leak) {
        await leak.updateStatus('resolved', req.user._id, 'User', 'Work verified and leak resolved');
      }
    }

    // Emit notifications
    const io = req.app.get('io');
    if (passed) {
      io.to(`plumber-${service.assignedPlumber._id}`).emit('work-verified', {
        serviceId: service._id,
        rating: rating,
        feedback: feedback
      });
    } else {
      io.to(`plumber-${service.assignedPlumber._id}`).emit('work-rejected', {
        serviceId: service._id,
        issues: issues,
        notes: notes
      });
    }

    res.json({
      message: passed ? 'Work verified successfully' : 'Work marked for revision',
      service: service
    });

  } catch (error) {
    console.error('Verify work error:', error);
    res.status(500).json({ message: 'Server error while verifying work' });
  }
});

// @route   POST /api/services/:id/messages
// @desc    Add message to service request communication
// @access  Private
router.post('/:id/messages', authenticateToken, [
  body('message').notEmpty().withMessage('Message is required')
], async (req, res) => {
  try {
    const { message } = req.body;
    
    const service = await ServiceRequest.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service request not found' });
    }

    // Check permissions
    const canMessage = (req.userType === 'staff') || 
                      (req.userType === 'plumber' && 
                       service.assignedPlumber && 
                       service.assignedPlumber.toString() === req.user._id.toString());

    if (!canMessage) {
      return res.status(403).json({ message: 'Not authorized to message in this service request' });
    }

    // Add message
    await service.addMessage(req.user._id, req.userType === 'staff' ? 'User' : 'Plumber', message);

    // Emit real-time message
    const io = req.app.get('io');
    const targetRoom = req.userType === 'staff' ? 
                      `plumber-${service.assignedPlumber}` : 
                      `staff-${service.requestedBy}`;
    
    io.to(targetRoom).emit('new-message', {
      serviceId: service._id,
      from: req.user.name,
      fromType: req.userType,
      message: message,
      timestamp: new Date()
    });

    res.json({
      message: 'Message sent successfully',
      communication: service.communication[service.communication.length - 1]
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error while sending message' });
  }
});

// @route   POST /api/services/:id/cancel
// @desc    Cancel a service request
// @access  Private
router.post('/:id/cancel', authenticateToken, [
  body('reason').notEmpty().withMessage('Cancellation reason is required')
], async (req, res) => {
  try {
    const { reason, refundRequested } = req.body;
    
    const service = await ServiceRequest.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service request not found' });
    }

    // Check permissions
    const canCancel = (req.userType === 'staff' && service.requestedBy.toString() === req.user._id.toString()) || 
                     (req.userType === 'plumber' && service.assignedPlumber && 
                      service.assignedPlumber.toString() === req.user._id.toString()) ||
                     (req.userType === 'staff' && req.user.role === 'admin');

    if (!canCancel) {
      return res.status(403).json({ message: 'Not authorized to cancel this service request' });
    }

    if (['work_completed', 'verified', 'closed'].includes(service.status)) {
      return res.status(400).json({ message: 'Cannot cancel completed service requests' });
    }

    // Update cancellation details
    service.cancellation = {
      cancelled: true,
      cancelledBy: req.user._id,
      cancelledByType: req.userType === 'staff' ? 'User' : 'Plumber',
      cancelledAt: new Date(),
      reason: reason,
      refundIssued: false
    };

    await service.updateStatus('cancelled', req.user._id, req.userType, reason);

    // If assigned, notify the other party
    const io = req.app.get('io');
    if (service.assignedPlumber && req.userType === 'staff') {
      io.to(`plumber-${service.assignedPlumber}`).emit('service-cancelled', {
        serviceId: service._id,
        reason: reason,
        cancelledBy: 'staff'
      });
    } else if (req.userType === 'plumber') {
      io.to(`staff-${service.requestedBy}`).emit('service-cancelled', {
        serviceId: service._id,
        reason: reason,
        cancelledBy: 'plumber'
      });
    }

    res.json({
      message: 'Service request cancelled successfully',
      service: service
    });

  } catch (error) {
    console.error('Cancel service error:', error);
    res.status(500).json({ message: 'Server error while cancelling service' });
  }
});

// @route   GET /api/services/pending/area
// @desc    Get pending service requests in plumber's area
// @access  Private (Plumber only)
router.get('/pending/area', authenticateToken, async (req, res) => {
  try {
    if (req.userType !== 'plumber') {
      return res.status(403).json({ message: 'Only plumbers can view area requests' });
    }

    const { radius = 15 } = req.query; // Default 15km radius
    const coordinates = req.user.location.coordinates;
    const maxDistance = radius * 1000; // Convert to meters

    const pendingServices = await ServiceRequest.getPendingInArea(coordinates, maxDistance);

    res.json({ services: pendingServices });

  } catch (error) {
    console.error('Get area services error:', error);
    res.status(500).json({ message: 'Server error while fetching area services' });
  }
});

// @route   GET /api/services/stats
// @desc    Get service request statistics
// @access  Private
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    let stats = {};

    if (req.userType === 'staff') {
      // Staff statistics
      const totalRequests = await ServiceRequest.countDocuments();
      const activeRequests = await ServiceRequest.countDocuments({
        status: { $in: ['pending', 'plumber_search', 'plumber_assigned', 'work_in_progress'] }
      });
      const completedRequests = await ServiceRequest.countDocuments({
        status: { $in: ['verified', 'closed'] }
      });
      const emergencyRequests = await ServiceRequest.countDocuments({
        priority: 'emergency',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      });

      stats = {
        totalRequests,
        activeRequests,
        completedRequests,
        emergencyRequests,
        completionRate: totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0
      };

    } else if (req.userType === 'plumber') {
      // Plumber statistics (already implemented in plumbers.js)
      const totalServices = await ServiceRequest.countDocuments({ 
        assignedPlumber: req.user._id 
      });
      const completedServices = await ServiceRequest.countDocuments({ 
        assignedPlumber: req.user._id,
        status: { $in: ['verified', 'closed'] }
      });
      const activeServices = await ServiceRequest.countDocuments({ 
        assignedPlumber: req.user._id,
        status: { $in: ['plumber_assigned', 'work_in_progress'] }
      });

      stats = {
        totalServices,
        completedServices,
        activeServices,
        completionRate: totalServices > 0 ? Math.round((completedServices / totalServices) * 100) : 0
      };
    }

    res.json({ stats });

  } catch (error) {
    console.error('Get service stats error:', error);
    res.status(500).json({ message: 'Server error while fetching stats' });
  }
});

export default router;
