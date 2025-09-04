import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Plumber from '../models/Plumber.js';

const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'aquaflow_secret_key';

// Generate JWT Token
const generateToken = (user, userType) => {
  return jwt.sign(
    { 
      userId: user._id, 
      email: user.email, 
      userType: userType,
      name: user.name 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// @route   POST /api/auth/register/staff
// @desc    Register a new staff member
// @access  Public
router.post('/register/staff', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').notEmpty().withMessage('Phone number is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phone, department, location } = req.body;

    // Check if user already exists
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      phone,
      department: department || 'Maintenance',
      location: location || { coordinates: [0, 0], address: '' }
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user, 'staff');

    res.status(201).json({
      message: 'Staff member registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });

  } catch (error) {
    console.error('Staff registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/register/plumber
// @desc    Register a new plumber
// @access  Public
router.post('/register/plumber', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('businessName').notEmpty().withMessage('Business name is required'),
  body('license.number').notEmpty().withMessage('License number is required'),
  body('location.coordinates').isArray().withMessage('Location coordinates are required'),
  body('location.address').notEmpty().withMessage('Address is required'),
  body('pricing.hourlyRate').isNumeric().withMessage('Hourly rate is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      name, email, password, phone, businessName, license, 
      location, services, pricing, availability 
    } = req.body;

    // Check if plumber already exists
    let existingPlumber = await Plumber.findOne({ email });
    if (existingPlumber) {
      return res.status(400).json({ message: 'Plumber already exists with this email' });
    }

    // Create new plumber
    const plumber = new Plumber({
      name,
      email,
      password,
      phone,
      businessName,
      license,
      location,
      services: services || ['leak_repair'],
      pricing,
      availability: availability || {
        isAvailable: true,
        emergencyAvailable: false
      }
    });

    await plumber.save();

    // Generate JWT token
    const token = generateToken(plumber, 'plumber');

    res.status(201).json({
      message: 'Plumber registered successfully (pending verification)',
      token,
      plumber: {
        id: plumber._id,
        name: plumber.name,
        email: plumber.email,
        businessName: plumber.businessName,
        isVerified: plumber.isVerified
      }
    });

  } catch (error) {
    console.error('Plumber registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login/staff
// @desc    Staff login
// @access  Public
router.post('/login/staff', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate JWT token
    const token = generateToken(user, 'staff');

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        location: user.location
      }
    });

  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   POST /api/auth/login/plumber
// @desc    Plumber login
// @access  Public
router.post('/login/plumber', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find plumber
    const plumber = await Plumber.findOne({ email });
    if (!plumber) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await plumber.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is active
    if (!plumber.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Update last active
    plumber.lastActive = new Date();
    await plumber.save();

    // Generate JWT token
    const token = generateToken(plumber, 'plumber');

    res.json({
      message: 'Login successful',
      token,
      plumber: {
        id: plumber._id,
        name: plumber.name,
        email: plumber.email,
        businessName: plumber.businessName,
        isVerified: plumber.isVerified,
        isAvailable: plumber.availability.isAvailable,
        rating: plumber.rating
      }
    });

  } catch (error) {
    console.error('Plumber login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/auth/verify
// @desc    Verify JWT token and get user data
// @access  Private
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    let user;
    if (decoded.userType === 'staff') {
      user = await User.findById(decoded.userId).select('-password');
    } else if (decoded.userType === 'plumber') {
      user = await Plumber.findById(decoded.userId).select('-password');
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    res.json({
      valid: true,
      userType: decoded.userType,
      user: user
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Middleware to authenticate requests
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    let user;
    if (decoded.userType === 'staff') {
      user = await User.findById(decoded.userId).select('-password');
    } else if (decoded.userType === 'plumber') {
      user = await Plumber.findById(decoded.userId).select('-password');
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = user;
    req.userType = decoded.userType;
    next();

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

export default router;
export { authenticateToken };
