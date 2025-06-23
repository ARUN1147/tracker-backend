const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema(
  {
    messageData: {
      type: String,
      required: [true, 'Notification message is missing']
    },
    subdomain: {
      type: String,
      required: [true, 'Company name is missing']
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notifications', notificationSchema);