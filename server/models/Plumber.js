import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const plumberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    required: true
  },
  businessName: {
    type: String,
    required: true
  },
  license: {
    number: {
      type: String,
      required: true
    },
    expiryDate: {
      type: Date,
      required: true
    },
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    address: {
      type: String,
      required: true
    },
    serviceRadius: {
      type: Number, // in kilometers
      default: 10
    }
  },
  services: [{
    type: String,
    enum: [
      'leak_repair',
      'pipe_installation',
      'drain_cleaning',
      'fixture_repair',
      'water_heater_service',
      'emergency_service',
      'inspection',
      'maintenance'
    ]
  }],
  availability: {
    isAvailable: {
      type: Boolean,
      default: true
    },
    schedule: {
      monday: { start: String, end: String, available: Boolean },
      tuesday: { start: String, end: String, available: Boolean },
      wednesday: { start: String, end: String, available: Boolean },
      thursday: { start: String, end: String, available: Boolean },
      friday: { start: String, end: String, available: Boolean },
      saturday: { start: String, end: String, available: Boolean },
      sunday: { start: String, end: String, available: Boolean }
    },
    emergencyAvailable: {
      type: Boolean,
      default: false
    }
  },
  pricing: {
    hourlyRate: {
      type: Number,
      required: true
    },
    emergencyRate: {
      type: Number
    },
    minimumCharge: {
      type: Number,
      default: 0
    }
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  completedJobs: {
    type: Number,
    default: 0
  },
  responseTime: {
    average: {
      type: Number, // in minutes
      default: 0
    }
  },
  profileImage: String,
  documents: [{
    type: String,
    name: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  bankDetails: {
    accountHolderName: String,
    accountNumber: String,
    routingNumber: String,
    bankName: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  lastActive: {
    type: Date,
    default: Date.now
  },
  deviceToken: String, // For push notifications
  preferences: {
    notifications: {
      newRequests: { type: Boolean, default: true },
      paymentUpdates: { type: Boolean, default: true }
    },
    autoAcceptEmergency: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Create geospatial index for location-based queries
plumberSchema.index({ location: '2dsphere' });
plumberSchema.index({ 'availability.isAvailable': 1, isActive: 1, isVerified: 1 });
plumberSchema.index({ services: 1 });
plumberSchema.index({ 'rating.average': -1 });

// Hash password before saving
plumberSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password
plumberSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to update rating
plumberSchema.methods.updateRating = function(newRating) {
  const totalRating = (this.rating.average * this.rating.count) + newRating;
  this.rating.count += 1;
  this.rating.average = totalRating / this.rating.count;
  return this.save();
};

// Method to toggle availability
plumberSchema.methods.toggleAvailability = function() {
  this.availability.isAvailable = !this.availability.isAvailable;
  this.lastActive = new Date();
  return this.save();
};

// Static method to find nearby plumbers
plumberSchema.statics.findNearby = function(coordinates, maxDistance = 10000, services = []) {
  const query = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance // in meters
      }
    },
    isActive: true,
    isVerified: true,
    'availability.isAvailable': true
  };
  
  if (services.length > 0) {
    query.services = { $in: services };
  }
  
  return this.find(query).sort({ 'rating.average': -1, completedJobs: -1 });
};

const Plumber = mongoose.model('Plumber', plumberSchema);

export default Plumber;
