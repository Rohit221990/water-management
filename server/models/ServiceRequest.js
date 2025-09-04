import mongoose from 'mongoose'

const serviceRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    unique: true
  },
  leak: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Leak',
    required: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedPlumber: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plumber'
  },
  status: {
    type: String,
    enum: [
      'pending',
      'plumber_search',
      'plumber_assigned',
      'plumber_confirmed',
      'plumber_en_route',
      'plumber_arrived',
      'work_in_progress',
      'work_completed',
      'verified',
      'closed',
      'cancelled'
    ],
    default: 'pending'
  },
  serviceType: {
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
    ],
    required: true,
    default: 'leak_repair'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'emergency'],
    required: true,
    default: 'medium'
  },
  scheduledDate: Date,
  estimatedDuration: {
    type: Number, // in minutes
    default: 60
  },
  plumberResponse: {
    accepted: Boolean,
    acceptedAt: Date,
    estimatedArrival: Date,
    message: String
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
    }
  },
  workDetails: {
    diagnosis: String,
    workPerformed: String,
    materialsUsed: [{
      item: String,
      quantity: Number,
      cost: Number
    }],
    laborHours: Number,
    beforePhotos: [String],
    afterPhotos: [String],
    notes: String
  },
  pricing: {
    laborCost: {
      type: Number,
      default: 0
    },
    materialsCost: {
      type: Number,
      default: 0
    },
    additionalCharges: [{
      description: String,
      amount: Number
    }],
    totalAmount: {
      type: Number,
      default: 0
    },
    isEmergencyRate: {
      type: Boolean,
      default: false
    }
  },
  timeline: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'timeline.userType'
    },
    userType: {
      type: String,
      enum: ['User', 'Plumber']
    },
    notes: String,
    location: {
      type: [Number] // [longitude, latitude]
    }
  }],
  rating: {
    staffRating: {
      score: { type: Number, min: 1, max: 5 },
      feedback: String,
      ratedAt: Date
    },
    plumberRating: {
      score: { type: Number, min: 1, max: 5 },
      feedback: String,
      ratedAt: Date
    }
  },
  communication: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'communication.fromType'
    },
    fromType: {
      type: String,
      enum: ['User', 'Plumber']
    },
    message: String,
    timestamp: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false }
  }],
  payment: {
    method: {
      type: String,
      enum: ['cash', 'card', 'digital_wallet', 'company_account'],
      default: 'company_account'
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAt: Date,
    refundedAt: Date,
    refundReason: String
  },
  verification: {
    staffVerified: {
      verified: { type: Boolean, default: false },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      verifiedAt: Date,
      notes: String
    },
    qualityCheck: {
      passed: Boolean,
      checkedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      checkedAt: Date,
      issues: [String],
      notes: String
    }
  },
  nearbyPlumbers: [{
    plumber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plumber'
    },
    distance: Number, // in meters
    responseTime: Number, // in minutes
    contacted: { type: Boolean, default: false },
    contactedAt: Date,
    response: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'no_response']
    }
  }],
  cancellation: {
    cancelled: { type: Boolean, default: false },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'cancellation.cancelledByType'
    },
    cancelledByType: {
      type: String,
      enum: ['User', 'Plumber']
    },
    cancelledAt: Date,
    reason: String,
    refundIssued: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Create indexes
serviceRequestSchema.index({ requestId: 1 });
serviceRequestSchema.index({ leak: 1 });
serviceRequestSchema.index({ assignedPlumber: 1, status: 1 });
serviceRequestSchema.index({ status: 1, priority: 1 });
serviceRequestSchema.index({ location: '2dsphere' });
serviceRequestSchema.index({ createdAt: -1 });
serviceRequestSchema.index({ scheduledDate: 1 });

// Pre-save middleware to generate request ID
serviceRequestSchema.pre('save', function(next) {
  if (!this.requestId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.requestId = `SR-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

// Method to update status with timeline
serviceRequestSchema.methods.updateStatus = function(newStatus, updatedBy, userType, notes = '', location = null) {
  this.status = newStatus;
  this.timeline.push({
    status: newStatus,
    updatedBy: updatedBy,
    userType: userType,
    notes: notes,
    location: location
  });
  
  return this.save();
};

// Method to calculate total amount
serviceRequestSchema.methods.calculateTotal = function() {
  let total = this.pricing.laborCost + this.pricing.materialsCost;
  
  if (this.pricing.additionalCharges && this.pricing.additionalCharges.length > 0) {
    total += this.pricing.additionalCharges.reduce((sum, charge) => sum + charge.amount, 0);
  }
  
  this.pricing.totalAmount = total;
  return this.save();
};

// Method to add communication message
serviceRequestSchema.methods.addMessage = function(from, fromType, message) {
  this.communication.push({
    from: from,
    fromType: fromType,
    message: message
  });
  
  return this.save();
};

// Method to assign plumber
serviceRequestSchema.methods.assignPlumber = function(plumberId, estimatedArrival) {
  this.assignedPlumber = plumberId;
  this.status = 'plumber_assigned';
  this.plumberResponse = {
    accepted: true,
    acceptedAt: new Date(),
    estimatedArrival: estimatedArrival
  };
  
  this.timeline.push({
    status: 'plumber_assigned',
    updatedBy: plumberId,
    userType: 'Plumber',
    notes: 'Plumber assigned to service request'
  });
  
  return this.save();
};

// Static method to find requests by plumber
serviceRequestSchema.statics.findByPlumber = function(plumberId, status = null) {
  const query = { assignedPlumber: plumberId };
  if (status) {
    query.status = status;
  }
  return this.find(query).populate('leak').sort({ createdAt: -1 });
};

// Static method to get pending requests in area
serviceRequestSchema.statics.getPendingInArea = function(coordinates, maxDistance = 10000) {
  return this.find({
    status: { $in: ['pending', 'plumber_search'] },
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance
      }
    }
  }).populate('leak').sort({ priority: -1, createdAt: 1 });
};

export default mongoose.model('ServiceRequest', serviceRequestSchema);
