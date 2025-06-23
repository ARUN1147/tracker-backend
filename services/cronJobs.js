// backend/services/cronJobs.js
const cron = require('node-cron');
const Settings = require('../models/Settings');

// Function to reset daily flags at midnight
const resetDailyFlags = async () => {
  try {
    await Settings.updateMany(
      { emailSentToday: true },
      { 
        $set: { 
          emailSentToday: false,
          lastEmailSent: null 
        } 
      }
    );
    
    console.log('Daily email flags reset successfully');
  } catch (error) {
    console.error('Error resetting daily flags:', error);
  }
};

// Start cron jobs
const startCronJobs = () => {
  console.log('Starting cron jobs for food request reports...');

  // Reset daily flags at midnight
  cron.schedule('0 0 * * *', resetDailyFlags, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  console.log('Cron jobs started successfully');
};

module.exports = {
  startCronJobs,
  resetDailyFlags
};