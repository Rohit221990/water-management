import express from 'express';
import { body, validationResult } from 'express-validator';
import { Client } from '@googlemaps/google-maps-services-js';
import { authenticateToken } from './auth.js';
import Plumber from '../models/Plumber.js';
import ServiceRequest from '../models/ServiceRequest.js';

const router = express.Router();

// Initialize Google Maps client
const googleMapsClient = new Client({});

// @route   GET /api/plumbers
// @desc    Get all plumbers with optional filters
// @access  Private (Staff only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.userType !== 'staff') {
      return res.status(403).json({ message: 'Only staff members can view all plumbers' });
    }

    const {
      isVerified,
      isAvailable,
      services,
      minRating,
      page = 1,
      limit = 10,
      sortBy = 'rating.average',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { isActive: true };
    if (isVerified !== undefined) query.isVerified = isVerified === 'true';
    if (isAvailable !== undefined) query['availability.isAvailable'] = isAvailable === 'true';
    if (services) query.services = { $in: services.split(',') };
    if (minRating) query['rating.average'] = { $gte: parseFloat(minRating) };

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const plumbers = await Plumber.find(query)
      .select('-password -bankDetails')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Plumber.countDocuments(query);

    res.json({
      plumbers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Get plumbers error:', error);
    res.status(500).json({ message: 'Server error while fetching plumbers' });
  }
});

// @route   GET /api/plumbers/nearby
// @desc    Find nearby plumbers based on location
// @access  Private
router.get('/nearby', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, radius = 10, services, emergency } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const coordinates = [parseFloat(longitude), parseFloat(latitude)];
    const maxDistance = radius * 1000; // Convert km to meters
    
    let serviceFilter = [];
    if (services) {
      serviceFilter = services.split(',');
    }
    if (emergency === 'true') {
      serviceFilter.push('emergency_service');
    }

    const nearbyPlumbers = await Plumber.findNearby(coordinates, maxDistance, serviceFilter)
      .select('-password -bankDetails');

    // Calculate distance using Google Maps API for more accurate results
    if (process.env.GOOGLE_MAPS_API_KEY && nearbyPlumbers.length > 0) {
      const origins = [`${latitude},${longitude}`];
      const destinations = nearbyPlumbers.map(plumber => 
        `${plumber.location.coordinates[1]},${plumber.location.coordinates[0]}`
      );

      try {
        const distanceResponse = await googleMapsClient.distancematrix({
          params: {
            origins: origins,
            destinations: destinations,
            mode: 'driving',
            units: 'metric',
            key: process.env.GOOGLE_MAPS_API_KEY
          }
        });

        if (distanceResponse.data.status === 'OK') {
          nearbyPlumbers.forEach((plumber, index) => {
            const element = distanceResponse.data.rows[0].elements[index];
            if (element.status === 'OK') {
              plumber.distance = element.distance.text;
              plumber.duration = element.duration.text;
              plumber.distanceValue = element.distance.value; // in meters
              plumber.durationValue = element.duration.value; // in seconds
            }
          });
        }
      } catch (gmapsError) {
        console.error('Google Maps API error:', gmapsError);
        // Continue without distance matrix data
      }
    }

    res.json({ plumbers: nearbyPlumbers });

  } catch (error) {
    console.error('Find nearby plumbers error:', error);
    res.status(500).json({ message: 'Server error while finding nearby plumbers' });
  }
});

// @route   POST /api/plumbers/find-for-service
// @desc    Find and rank plumbers for a specific service request
// @access  Private (Staff only)
router.post('/find-for-service', authenticateToken, [
  body('location.coordinates').isArray({ min: 2, max: 2 }).withMessage('Valid coordinates required'),
  body('serviceType').notEmpty().withMessage('Service type is required'),
  body('priority').isIn(['low', 'medium', 'high', 'emergency']).withMessage('Valid priority required')
], async (req, res) => {
  try {
    if (req.userType !== 'staff') {
      return res.status(403).json({ message: 'Only staff members can search for plumbers' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { location, serviceType, priority, urgency = 'normal' } = req.body;
    const coordinates = location.coordinates;

    // Define search radius based on priority and urgency
    let searchRadius = 10000; // 10km default
    if (priority === 'emergency' || urgency === 'urgent') {
      searchRadius = 25000; // 25km for emergencies
    } else if (priority === 'high') {
      searchRadius = 15000; // 15km for high priority
    }

    // Find nearby plumbers with required service
    const nearbyPlumbers = await Plumber.findNearby(
      coordinates, 
      searchRadius, 
      [serviceType]
    ).select('-password -bankDetails');

    if (nearbyPlumbers.length === 0) {
      return res.json({ 
        message: 'No plumbers found in the area for this service',
        plumbers: [],
        searchRadius: searchRadius / 1000 // return in km
      });
    }

    // Enhanced ranking algorithm
    const rankedPlumbers = nearbyPlumbers.map(plumber => {
      let score = 0;
      const baseScore = 100;

      // Rating score (40% weight)
      score += (plumber.rating.average / 5) * 40;

      // Experience score based on completed jobs (20% weight)
      const experienceScore = Math.min(plumber.completedJobs / 50, 1) * 20;
      score += experienceScore;

      // Availability score (25% weight)
      if (plumber.availability.isAvailable) {
        score += 25;
        if (priority === 'emergency' && plumber.availability.emergencyAvailable) {
          score += 10; // Bonus for emergency availability
        }
      }

      // Response time score (15% weight)
      if (plumber.responseTime.average > 0) {
        const responseScore = Math.max(0, 15 - (plumber.responseTime.average / 60) * 3);
        score += responseScore;
      } else {
        score += 7.5; // Average score for unknown response time
      }

      // Distance penalty (reduce score based on distance)
      const distanceKm = plumber.distance ? 
        parseFloat(plumber.distance.replace(' km', '')) : 
        0;
      const distancePenalty = Math.min(distanceKm * 2, 20);
      score = Math.max(0, score - distancePenalty);

      return {
        ...plumber.toObject(),
        matchScore: Math.round(score),
        ranking: {
          ratingScore: Math.round((plumber.rating.average / 5) * 40),
          experienceScore: Math.round(experienceScore),
          availabilityScore: plumber.availability.isAvailable ? 25 : 0,
          responseTimeScore: plumber.responseTime.average > 0 ? 
            Math.round(Math.max(0, 15 - (plumber.responseTime.average / 60) * 3)) : 8,
          distancePenalty: Math.round(distancePenalty)
        }
      };
    });

    // Sort by match score descending
    rankedPlumbers.sort((a, b) => b.matchScore - a.matchScore);

    // Add Google Maps distance matrix data if API key is available
    if (process.env.GOOGLE_MAPS_API_KEY && rankedPlumbers.length > 0) {
      const origins = [`${coordinates[1]},${coordinates[0]}`];
      const destinations = rankedPlumbers.map(plumber => 
        `${plumber.location.coordinates[1]},${plumber.location.coordinates[0]}`
      );

      try {
        const distanceResponse = await googleMapsClient.distancematrix({
          params: {
            origins: origins,
            destinations: destinations,
            mode: 'driving',
            units: 'metric',
            key: process.env.GOOGLE_MAPS_API_KEY
          }
        });

        if (distanceResponse.data.status === 'OK') {
          rankedPlumbers.forEach((plumber, index) => {
            const element = distanceResponse.data.rows[0].elements[index];
            if (element.status === 'OK') {
              plumber.googleMapsDistance = element.distance.text;
              plumber.googleMapsDuration = element.duration.text;
              plumber.estimatedArrival = new Date(Date.now() + element.duration.value * 1000);
            }
          });
        }
      } catch (gmapsError) {
        console.error('Google Maps API error:', gmapsError);
      }
    }

    res.json({
      message: `Found ${rankedPlumbers.length} plumbers for ${serviceType}`,
      plumbers: rankedPlumbers.slice(0, 10), // Return top 10
      searchRadius: searchRadius / 1000,
      totalFound: rankedPlumbers.length,
      criteria: {
        serviceType,
        priority,
        urgency,
        location: coordinates
      }
    });

  } catch (error) {
    console.error('Find plumbers for service error:', error);
    res.status(500).json({ message: 'Server error while finding plumbers' });
  }
});

// @route   GET /api/plumbers/:id
// @desc    Get plumber profile by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const plumber = await Plumber.findById(req.params.id)
      .select('-password -bankDetails');

    if (!plumber) {
      return res.status(404).json({ message: 'Plumber not found' });
    }

    // Get recent service requests for this plumber
    const recentServices = await ServiceRequest.find({ assignedPlumber: req.params.id })
      .populate('leak', 'title severity location')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ 
      plumber: plumber,
      recentServices: recentServices
    });

  } catch (error) {
    console.error('Get plumber error:', error);
    res.status(500).json({ message: 'Server error while fetching plumber' });
  }
});

// @route   PUT /api/plumbers/:id/verify
// @desc    Verify a plumber (admin only)
// @access  Private (Admin only)
router.put('/:id/verify', authenticateToken, async (req, res) => {
  try {
    if (req.userType !== 'staff' || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can verify plumbers' });
    }

    const plumber = await Plumber.findById(req.params.id);
    if (!plumber) {
      return res.status(404).json({ message: 'Plumber not found' });
    }

    plumber.isVerified = true;
    plumber.verifiedAt = new Date();
    await plumber.save();

    // Emit notification to plumber
    const io = req.app.get('io');
    io.to(`plumber-${plumber._id}`).emit('verification-approved', {
      message: 'Your plumber account has been verified!',
      timestamp: new Date()
    });

    res.json({ 
      message: 'Plumber verified successfully',
      plumber: plumber 
    });

  } catch (error) {
    console.error('Verify plumber error:', error);
    res.status(500).json({ message: 'Server error while verifying plumber' });
  }
});

// @route   PUT /api/plumbers/profile
// @desc    Update plumber profile (plumbers only)
// @access  Private (Plumber only)
router.put('/profile', authenticateToken, [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('phone').optional().notEmpty().withMessage('Phone cannot be empty'),
  body('businessName').optional().notEmpty().withMessage('Business name cannot be empty'),
], async (req, res) => {
  try {
    if (req.userType !== 'plumber') {
      return res.status(403).json({ message: 'Only plumbers can update their profile' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      phone,
      businessName,
      services,
      location,
      pricing,
      availability,
      profileImage
    } = req.body;

    const plumber = await Plumber.findById(req.user._id);
    if (!plumber) {
      return res.status(404).json({ message: 'Plumber not found' });
    }

    // Update fields
    if (name) plumber.name = name;
    if (phone) plumber.phone = phone;
    if (businessName) plumber.businessName = businessName;
    if (services) plumber.services = services;
    if (location) plumber.location = location;
    if (pricing) plumber.pricing = { ...plumber.pricing, ...pricing };
    if (availability) plumber.availability = { ...plumber.availability, ...availability };
    if (profileImage) plumber.profileImage = profileImage;

    plumber.lastActive = new Date();
    await plumber.save();

    res.json({ 
      message: 'Profile updated successfully',
      plumber: plumber.toObject({ transform: (doc, ret) => {
        delete ret.password;
        delete ret.bankDetails;
        return ret;
      }})
    });

  } catch (error) {
    console.error('Update plumber profile error:', error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
});

// @route   PUT /api/plumbers/availability
// @desc    Toggle plumber availability
// @access  Private (Plumber only)
router.put('/availability', authenticateToken, async (req, res) => {
  try {
    if (req.userType !== 'plumber') {
      return res.status(403).json({ message: 'Only plumbers can update availability' });
    }

    const { isAvailable, emergencyAvailable } = req.body;

    const plumber = await Plumber.findById(req.user._id);
    if (!plumber) {
      return res.status(404).json({ message: 'Plumber not found' });
    }

    if (isAvailable !== undefined) {
      plumber.availability.isAvailable = isAvailable;
    }
    if (emergencyAvailable !== undefined) {
      plumber.availability.emergencyAvailable = emergencyAvailable;
    }

    plumber.lastActive = new Date();
    await plumber.save();

    // Emit availability update
    const io = req.app.get('io');
    io.to('staff-room').emit('plumber-availability-updated', {
      plumberId: plumber._id,
      name: plumber.name,
      isAvailable: plumber.availability.isAvailable,
      emergencyAvailable: plumber.availability.emergencyAvailable
    });

    res.json({ 
      message: 'Availability updated successfully',
      availability: plumber.availability
    });

  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ message: 'Server error while updating availability' });
  }
});

// @route   GET /api/plumbers/my-services
// @desc    Get plumber's service requests
// @access  Private (Plumber only)
router.get('/my-services', authenticateToken, async (req, res) => {
  try {
    if (req.userType !== 'plumber') {
      return res.status(403).json({ message: 'Only plumbers can view their services' });
    }

    const { status, page = 1, limit = 10 } = req.query;

    const services = await ServiceRequest.findByPlumber(req.user._id, status)
      .populate('leak', 'title severity location reportedBy')
      .populate('requestedBy', 'name email phone department')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({ services });

  } catch (error) {
    console.error('Get plumber services error:', error);
    res.status(500).json({ message: 'Server error while fetching services' });
  }
});

// @route   GET /api/plumbers/stats
// @desc    Get plumber statistics
// @access  Private (Plumber only)
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    if (req.userType !== 'plumber') {
      return res.status(403).json({ message: 'Only plumbers can view their stats' });
    }

    const plumber = await Plumber.findById(req.user._id);
    const totalServices = await ServiceRequest.countDocuments({ 
      assignedPlumber: req.user._id 
    });
    const completedServices = await ServiceRequest.countDocuments({ 
      assignedPlumber: req.user._id,
      status: 'closed'
    });
    const activeServices = await ServiceRequest.countDocuments({ 
      assignedPlumber: req.user._id,
      status: { $in: ['plumber_assigned', 'plumber_confirmed', 'plumber_en_route', 'plumber_arrived', 'work_in_progress'] }
    });

    // Calculate earnings (you might want to add a more sophisticated calculation)
    const earnings = await ServiceRequest.aggregate([
      { $match: { assignedPlumber: plumber._id, 'payment.status': 'completed' } },
      { $group: { _id: null, total: { $sum: '$pricing.totalAmount' } } }
    ]);

    res.json({
      stats: {
        totalServices,
        completedServices,
        activeServices,
        completionRate: totalServices > 0 ? Math.round((completedServices / totalServices) * 100) : 0,
        rating: plumber.rating,
        totalEarnings: earnings.length > 0 ? earnings[0].total : 0,
        responseTime: plumber.responseTime.average || 0
      }
    });

  } catch (error) {
    console.error('Get plumber stats error:', error);
    res.status(500).json({ message: 'Server error while fetching stats' });
  }
});

export default router;
