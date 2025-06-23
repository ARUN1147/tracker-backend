const mongoose = require('mongoose');

const settingsSchema = mongoose.Schema({
  subdomain: {
    type: String,
    required: true,
    unique: true
  },
  
  // Breakfast settings
  breakfastEnabled: {
    type: Boolean,
    default: false
  },
  breakfastOpenTime: {
    type: String,
    default: '07:00'
  },
  breakfastCloseTime: {
    type: String,
    default: '09:00'
  },
  breakfastAutoSwitch: {
    type: Boolean,
    default: false
  },
  
  // Lunch settings (existing)
  foodRequestEnabled: {
    type: Boolean,
    default: true
  },
  foodRequestOpenTime: {
    type: String,
    default: '12:00'
  },
  foodRequestCloseTime: {
    type: String,
    default: '14:00'
  },
  foodRequestAutoSwitch: {
    type: Boolean,
    default: false
  },
  
  // Dinner settings
  dinnerEnabled: {
    type: Boolean,
    default: false
  },
  dinnerOpenTime: {
    type: String,
    default: '18:00'
  },
  dinnerCloseTime: {
    type: String,
    default: '20:00'
  },
  dinnerAutoSwitch: {
    type: Boolean,
    default: false
  },
  
  // Email settings
  emailReportsEnabled: {
    type: Boolean,
    default: false
  },
  lastEmailSent: {
    type: Date
  },
  emailSentToday: {
    type: Boolean,
    default: false
  },

  // Attendance and productivity settings
  considerOvertime: {
    type: Boolean,
    default: false
  },
  deductSalary: {
    type: Boolean,
    default: true
  },
  permissionTimeMinutes: {
    type: Number,
    default: 15
  },
  salaryDeductionPerBreak: {
    type: Number,
    default: 10
  },
  
  // Common fields
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Method to reset daily email flag
settingsSchema.methods.resetDailyEmailFlag = function() {
  const today = new Date();
  const lastSent = this.lastEmailSent;
  
  if (!lastSent || lastSent.toDateString() !== today.toDateString()) {
    this.emailSentToday = false;
    return true;
  }
  return false;
};

module.exports = mongoose.model('Settings', settingsSchema);