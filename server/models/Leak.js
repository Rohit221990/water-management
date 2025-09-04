import mongoose from 'mongoose'
const leakSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['reported', 'confirmed', 'assigned', 'in_progress', 'resolved', 'closed'],
    default: 'reported'
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
    building: String,
    floor: String,
    room: String
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportMethod: {
    type: String,
    enum: ['manual', 'iot_sensor', 'system_alert'],
    required: true
  },
  sensorData: {
    sensorId: String,
    waterLevel: Number,
    pressure: Number,
    flow: Number,
    temperature: Number,
    ph: Number,
    lastReading: Date,
    alertThreshold: Number
  },
  images: [{
    url: String,
    caption: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  assignedService: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceRequest'
  },
  estimatedDamage: {
    level: {
      type: String,
      enum: ['minimal', 'moderate', 'significant', 'severe']
    },
    cost: Number,
    description: String
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
    notes: String
  }],
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  tags: [String],
  isEmergency: {
    type: Boolean,
    default: false
  },
  resolvedAt: Date,
  resolutionNotes: String,
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: Date,
  waterShutoff: {
    required: { type: Boolean, default: false },
    completed: { type: Boolean, default: false },
    location: String,
    completedAt: Date
  },
  affectedAreas: [{
    area: String,
    impact: String
  }],
  preventiveMeasures: [String]
}, {
  timestamps: true
});

// Create geospatial index for location-based queries
leakSchema.index({ location: '2dsphere' });
leakSchema.index({ status: 1, severity: 1 });
leakSchema.index({ reportedBy: 1, createdAt: -1 });
leakSchema.index({ 'sensorData.sensorId': 1 });
leakSchema.index({ isEmergency: 1, priority: -1 });

// Virtual for calculating leak duration
leakSchema.virtual('duration').get(function() {
  if (this.resolvedAt) {
    return this.resolvedAt - this.createdAt;
  }
  return Date.now() - this.createdAt;
});

// Method to update status
leakSchema.methods.updateStatus = function(newStatus, updatedBy, userType, notes = '') {
  this.status = newStatus;
  this.timeline.push({
    status: newStatus,
    updatedBy: updatedBy,
    userType: userType,
    notes: notes
  });
  
  if (newStatus === 'resolved') {
    this.resolvedAt = new Date();
  }
  
  return this.save();
};

// Method to calculate priority based on severity and other factors
leakSchema.methods.calculatePriority = function() {
  let priority = 5; // base priority
  
  switch (this.severity) {
    case 'critical':
      priority = 10;
      break;
    case 'high':
      priority = 8;
      break;
    case 'medium':
      priority = 5;
      break;
    case 'low':
      priority = 3;
      break;
  }
  
  // Increase priority for emergency
  if (this.isEmergency) priority = Math.min(10, priority + 2);
  
  // Increase priority if water shutoff required
  if (this.waterShutoff.required && !this.waterShutoff.completed) {
    priority = Math.min(10, priority + 1);
  }
  
  // Increase priority based on age
  const ageInHours = (Date.now() - this.createdAt) / (1000 * 60 * 60);
  if (ageInHours > 24) priority = Math.min(10, priority + 1);
  if (ageInHours > 48) priority = Math.min(10, priority + 1);
  
  this.priority = priority;
  return this.save();
};

// Static method to get active leaks
leakSchema.statics.getActiveLeaks = function() {
  return this.find({
    status: { $in: ['reported', 'confirmed', 'assigned', 'in_progress'] }
  }).sort({ priority: -1, createdAt: 1 });
};

// Static method to get nearby leaks
leakSchema.statics.getNearbyLeaks = function(coordinates, maxDistance = 1000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance // in meters
      }
    },
    status: { $in: ['reported', 'confirmed', 'assigned', 'in_progress'] }
  });
};

export default mongoose.model('Leak', leakSchema);
