// backend/schedulers/foodRequestScheduler.js
const cron = require('node-cron');
const { sendDailyReportForOrganization, sendMealReportForOrganization } = require('../services/foodRequestReportService');
const Settings = require('../models/Settings');

// Get all active subdomains with email reports enabled
const getActiveSubdomains = async () => {
  try {
    const settings = await Settings.find({ 
      emailReportsEnabled: true 
    }).select('subdomain breakfastEnabled breakfastCloseTime foodRequestEnabled foodRequestCloseTime dinnerEnabled dinnerCloseTime');
    
    return settings;
  } catch (error) {
    console.error('Error fetching active subdomains:', error);
    return [];
  }
};

// Convert time string (HH:MM) to minutes since midnight
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Get current time in minutes since midnight
const getCurrentTimeInMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

// Check if current time matches the closing time (within 1 minute)
const isClosingTime = (closeTime) => {
  const closeTimeMinutes = timeToMinutes(closeTime);
  const currentMinutes = getCurrentTimeInMinutes();
  return Math.abs(currentMinutes - closeTimeMinutes) <= 1;
};

// Dynamic meal report scheduler - runs every minute to check closing times
const scheduleDynamicMealReports = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const settingsArray = await getActiveSubdomains();
      
      for (const settings of settingsArray) {
        const { subdomain } = settings;
        
        // Check breakfast closing time
        if (settings.breakfastEnabled && settings.breakfastCloseTime) {
          if (isClosingTime(settings.breakfastCloseTime)) {
            try {
              const result = await sendMealReportForOrganization(subdomain, 'breakfast');
              if (result.success) {
                console.log(`Breakfast report sent for ${subdomain}`);
              }
            } catch (error) {
              console.error(`Failed to send breakfast report for ${subdomain}:`, error.message);
            }
          }
        }
        
        // Check lunch closing time
        if (settings.foodRequestEnabled && settings.foodRequestCloseTime) {
          if (isClosingTime(settings.foodRequestCloseTime)) {
            try {
              const result = await sendMealReportForOrganization(subdomain, 'lunch');
              if (result.success) {
                console.log(`Lunch report sent for ${subdomain}`);
              }
            } catch (error) {
              console.error(`Failed to send lunch report for ${subdomain}:`, error.message);
            }
          }
        }
        
        // Check dinner closing time
        if (settings.dinnerEnabled && settings.dinnerCloseTime) {
          if (isClosingTime(settings.dinnerCloseTime)) {
            try {
              const result = await sendMealReportForOrganization(subdomain, 'dinner');
              if (result.success) {
                console.log(`Dinner report sent for ${subdomain}`);
              }
            } catch (error) {
              console.error(`Failed to send dinner report for ${subdomain}:`, error.message);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in meal report scheduler:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
};

// Send daily comprehensive report
const scheduleDailyReports = () => {
  cron.schedule('0 23 * * *', async () => {
    try {
      const settingsArray = await getActiveSubdomains();
      
      for (const settings of settingsArray) {
        const { subdomain } = settings;
        
        try {
          const result = await sendDailyReportForOrganization(subdomain);
          if (result.success) {
            console.log(`Daily report sent for ${subdomain}`);
          }
        } catch (error) {
          console.error(`Failed to send daily report for ${subdomain}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error in daily report scheduler:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
};

// Initialize all schedulers
const initializeFoodRequestSchedulers = () => {
  console.log('Initializing food request email schedulers...');
  
  scheduleDynamicMealReports();
  scheduleDailyReports();
  
  console.log('Food request schedulers initialized successfully');
};

module.exports = {
  initializeFoodRequestSchedulers
};