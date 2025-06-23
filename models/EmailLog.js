// backend/models/EmailLog.js
const mongoose = require('mongoose');

const emailLogSchema = mongoose.Schema({
  subdomain: {
    type: String,
    required: [true, 'Company name is required']
  },
  emailType: {
    type: String,
    required: true,
    enum: [
      'food_request_report', 
      'daily_comprehensive_report',
      'breakfast_closing_report',
      'lunch_closing_report', 
      'dinner_closing_report',
      'breakfast_request_report',
      'lunch_request_report',
      'dinner_request_report',
      'other'
    ]
  },
  recipients: [{
    type: String,
    required: true
  }],
  subject: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['sent', 'failed'],
    required: true
  },
  messageId: {
    type: String
  },
  reportData: {
    type: Object
  },
  errorMessage: {
    type: String
  },
  sentAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EmailLog', emailLogSchema);