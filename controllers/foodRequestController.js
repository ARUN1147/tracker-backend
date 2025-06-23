// backend/controllers/foodRequestController.js
const asyncHandler = require('express-async-handler');
const FoodRequest = require('../models/FoodRequest');
const Settings = require('../models/Settings');
const Worker = require('../models/Worker');

// Get all food requests for current day by meal type (admin)
const getTodayRequests = asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  const { mealType } = req.query;

  if (!subdomain || subdomain == 'main') {
    res.status(400);
    throw new Error('Company name is missing, login again.');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let query = {
    subdomain,
    date: {
      $gte: today,
      $lt: tomorrow
    }
  };

  if (mealType && mealType !== 'all') {
    query.mealType = mealType;
  }

  const requests = await FoodRequest.find(query)
    .populate('worker', 'name rfid department photo')
    .populate('department', 'name')
    .sort({ createdAt: -1 });

  res.status(200).json(requests);
});

// Submit a food request (worker)
const submitFoodRequest = asyncHandler(async (req, res) => {
  const { subdomain, mealType } = req.body;

  if (!subdomain || subdomain === 'main') {
    res.status(400);
    throw new Error('Company name is missing, login again.');
  }

  if (!mealType || !['breakfast', 'lunch', 'dinner'].includes(mealType)) {
    res.status(400);
    throw new Error('Valid meal type is required (breakfast, lunch, or dinner)');
  }

  const settings = await Settings.findOne({ subdomain }) || await Settings.create({ subdomain });
  const mealSettings = getMealSettings(settings, mealType);
  
  if (!mealSettings) {
    res.status(400);
    throw new Error(`${mealType} settings not found`);
  }

  // Check if meal is enabled and within time range
  if (mealSettings.autoSwitch) {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (currentTime < mealSettings.openTime || currentTime >= mealSettings.closeTime) {
      res.status(400);
      throw new Error(`${mealType} requests are only available between ${mealSettings.openTime} and ${mealSettings.closeTime}`);
    }
  } else if (!mealSettings.enabled) {
    res.status(400);
    throw new Error(`${mealType} requests are currently disabled`);
  }

  // Check if worker has already submitted a request for this meal today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingRequest = await FoodRequest.findOne({
    worker: req.user._id,
    mealType,
    date: {
      $gte: today,
      $lt: tomorrow
    }
  });

  if (existingRequest) {
    res.status(400);
    throw new Error(`You have already submitted a ${mealType} request today`);
  }

  const worker = await Worker.findById(req.user._id);
  if (!worker) {
    res.status(404);
    throw new Error('Worker not found');
  }

  const request = await FoodRequest.create({
    worker: req.user._id,
    subdomain,
    department: worker.department,
    mealType,
    date: new Date()
  });

  const populatedRequest = await FoodRequest.findById(request._id)
    .populate('worker', 'name rfid department photo')
    .populate('department', 'name');

  res.status(201).json(populatedRequest);
});

// Helper function to get meal-specific settings
const getMealSettings = (settings, mealType) => {
  switch (mealType) {
    case 'breakfast':
      return {
        enabled: settings.breakfastEnabled,
        openTime: settings.breakfastOpenTime,
        closeTime: settings.breakfastCloseTime,
        autoSwitch: settings.breakfastAutoSwitch
      };
    case 'lunch':
      return {
        enabled: settings.foodRequestEnabled,
        openTime: settings.foodRequestOpenTime,
        closeTime: settings.foodRequestCloseTime,
        autoSwitch: settings.foodRequestAutoSwitch
      };
    case 'dinner':
      return {
        enabled: settings.dinnerEnabled,
        openTime: settings.dinnerOpenTime,
        closeTime: settings.dinnerCloseTime,
        autoSwitch: settings.dinnerAutoSwitch
      };
    default:
      return null;
  }
};

// Toggle food request submissions for specific meal type (admin)
const toggleFoodRequests = asyncHandler(async (req, res) => {
  const { subdomain } = req.params;
  const { mealType } = req.body;

  if (!subdomain || subdomain == 'main') {
    res.status(400);
    throw new Error('Company name is missing, login again.');
  }

  if (!mealType || !['breakfast', 'lunch', 'dinner'].includes(mealType)) {
    res.status(400);
    throw new Error('Valid meal type is required');
  }

  const settings = await Settings.findOne({ subdomain }) || await Settings.create({ subdomain });

  switch (mealType) {
    case 'breakfast':
      settings.breakfastEnabled = !settings.breakfastEnabled;
      break;
    case 'lunch':
      settings.foodRequestEnabled = !settings.foodRequestEnabled;
      break;
    case 'dinner':
      settings.dinnerEnabled = !settings.dinnerEnabled;
      break;
  }

  settings.lastUpdated = new Date();
  settings.updatedBy = req.user._id;
  await settings.save();

  const mealSettings = getMealSettings(settings, mealType);
  res.status(200).json({ 
    mealType,
    enabled: mealSettings.enabled 
  });
});

const getSettings = asyncHandler(async (req, res) => {
  const { subdomain } = req.params;

  if (!subdomain || subdomain === 'main') {
    res.status(400);
    throw new Error('Company name is missing, login again.');
  }

  let settings = await Settings.findOne({ subdomain });
  
  if (!settings) {
    settings = await Settings.create({ subdomain });
  }
  
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  let settingsUpdated = false;

  // Update auto-switch settings
  if (settings.breakfastAutoSwitch) {
    const shouldBeEnabled = currentTime >= settings.breakfastOpenTime &&
                             currentTime < settings.breakfastCloseTime;
    if (settings.breakfastEnabled !== shouldBeEnabled) {
      settings.breakfastEnabled = shouldBeEnabled;
      settingsUpdated = true;
    }
  }

  if (settings.foodRequestAutoSwitch) {
    const shouldBeEnabled = currentTime >= settings.foodRequestOpenTime &&
                             currentTime < settings.foodRequestCloseTime;
    if (settings.foodRequestEnabled !== shouldBeEnabled) {
      settings.foodRequestEnabled = shouldBeEnabled;
      settingsUpdated = true;
    }
  }

  if (settings.dinnerAutoSwitch) {
    const shouldBeEnabled = currentTime >= settings.dinnerOpenTime &&
                             currentTime < settings.dinnerCloseTime;
    if (settings.dinnerEnabled !== shouldBeEnabled) {
      settings.dinnerEnabled = shouldBeEnabled;
      settingsUpdated = true;
    }
  }

  if (settingsUpdated) {
    settings.lastUpdated = new Date();
    await settings.save();
  }

  res.status(200).json({ 
    subdomain: settings.subdomain,
    breakfast: {
      enabled: settings.breakfastEnabled,
      openTime: settings.breakfastOpenTime,
      closeTime: settings.breakfastCloseTime,
      autoSwitch: settings.breakfastAutoSwitch
    },
    lunch: {
      enabled: settings.foodRequestEnabled,
      openTime: settings.foodRequestOpenTime,
      closeTime: settings.foodRequestCloseTime,
      autoSwitch: settings.foodRequestAutoSwitch
    },
    dinner: {
      enabled: settings.dinnerEnabled,
      openTime: settings.dinnerOpenTime,
      closeTime: settings.dinnerCloseTime,
      autoSwitch: settings.dinnerAutoSwitch
    },
    emailReportsEnabled: settings.emailReportsEnabled,
    lastEmailSent: settings.lastEmailSent,
    emailSentToday: settings.emailSentToday,
    considerOvertime: settings.considerOvertime,
    deductSalary: settings.deductSalary,
    permissionTimeMinutes: settings.permissionTimeMinutes,
    salaryDeductionPerBreak: settings.salaryDeductionPerBreak,
    lastUpdated: settings.lastUpdated,
    updatedBy: settings.updatedBy
  });
});

// Update meal-specific settings
const updateMealSettings = asyncHandler(async (req, res) => {
  const { subdomain, mealType } = req.params;
  const { openTime, closeTime, autoSwitch } = req.body;

  if (!subdomain || subdomain === 'main') {
    res.status(400);
    throw new Error('Company name is missing, login again.');
  }

  if (!mealType || !['breakfast', 'lunch', 'dinner'].includes(mealType)) {
    res.status(400);
    throw new Error('Valid meal type is required');
  }

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(openTime) || !timeRegex.test(closeTime)) {
    res.status(400);
    throw new Error('Invalid time format. Please use HH:MM format (24-hour).');
  }

  const settings = await Settings.findOne({ subdomain }) || await Settings.create({ subdomain });

  switch (mealType) {
    case 'breakfast':
      settings.breakfastOpenTime = openTime;
      settings.breakfastCloseTime = closeTime;
      settings.breakfastAutoSwitch = autoSwitch;
      break;
    case 'lunch':
      settings.foodRequestOpenTime = openTime;
      settings.foodRequestCloseTime = closeTime;
      settings.foodRequestAutoSwitch = autoSwitch;
      break;
    case 'dinner':
      settings.dinnerOpenTime = openTime;
      settings.dinnerCloseTime = closeTime;
      settings.dinnerAutoSwitch = autoSwitch;
      break;
  }

  settings.lastUpdated = new Date();
  settings.updatedBy = req.user._id;
  await settings.save();

  const mealSettings = getMealSettings(settings, mealType);
  res.status(200).json({
    mealType,
    ...mealSettings
  });
});

// Get meal-specific requests summary
const getMealsSummary = asyncHandler(async (req, res) => {
  const { subdomain } = req.params;

  if (!subdomain || subdomain === 'main') {
    res.status(400);
    throw new Error('Company name is missing, login again.');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [breakfastCount, lunchCount, dinnerCount] = await Promise.all([
    FoodRequest.countDocuments({
      subdomain,
      mealType: 'breakfast',
      date: { $gte: today, $lt: tomorrow }
    }),
    FoodRequest.countDocuments({
      subdomain,
      mealType: 'lunch',
      date: { $gte: today, $lt: tomorrow }
    }),
    FoodRequest.countDocuments({
      subdomain,
      mealType: 'dinner',
      date: { $gte: today, $lt: tomorrow }
    })
  ]);

  res.status(200).json({
    breakfast: breakfastCount,
    lunch: lunchCount,
    dinner: dinnerCount,
    total: breakfastCount + lunchCount + dinnerCount
  });
});

// Toggle email reports
const toggleEmailReports = asyncHandler(async (req, res) => {
  const { subdomain } = req.params;

  if (!subdomain || subdomain === 'main') {
    res.status(400);
    throw new Error('Company name is missing, login again.');
  }

  const settings = await Settings.findOne({ subdomain }) || await Settings.create({ subdomain });
  
  settings.emailReportsEnabled = !settings.emailReportsEnabled;
  settings.lastUpdated = new Date();
  settings.updatedBy = req.user._id;
  
  await settings.save();

  res.status(200).json({ 
    message: `Email reports ${settings.emailReportsEnabled ? 'enabled' : 'disabled'} successfully`,
    emailReportsEnabled: settings.emailReportsEnabled
  });
});

// Update settings
const updateSettings = async (req, res) => {
  try {
    const { subdomain } = req.params;
    const updates = req.body;
    const updatedBy = req.user?.id || req.body.updatedBy; // Assuming user ID comes from auth middleware

    // Find existing settings
    let settings = await Settings.findOne({ subdomain });

    if (!settings) {
      // Create new settings if not found
      settings = new Settings({
        subdomain,
        ...updates,
        updatedBy,
        lastUpdated: new Date()
      });
    } else {
      // Update existing settings
      Object.keys(updates).forEach(key => {
        if (key !== 'subdomain') { // Don't allow subdomain updates
          settings[key] = updates[key];
        }
      });
      
      settings.updatedBy = updatedBy;
      settings.lastUpdated = new Date();
    }

    // Save settings
    await settings.save();

    // Populate updatedBy for response
    await settings.populate('updatedBy', 'name email');

    const response = {
      success: true,
      message: 'Settings updated successfully',
      data: {
        subdomain: settings.subdomain,
        
        // Breakfast settings
        breakfast: getMealSettings(settings, 'breakfast'),
        
        // Lunch settings
        lunch: getMealSettings(settings, 'lunch'),
        
        // Dinner settings
        dinner: getMealSettings(settings, 'dinner'),
        
        // Email settings
        emailSettings: {
          emailReportsEnabled: settings.emailReportsEnabled,
          lastEmailSent: settings.lastEmailSent,
          emailSentToday: settings.emailSentToday
        },
        
        // Attendance and productivity settings
        attendanceSettings: {
          considerOvertime: settings.considerOvertime,
          deductSalary: settings.deductSalary,
          permissionTimeMinutes: settings.permissionTimeMinutes,
          salaryDeductionPerBreak: settings.salaryDeductionPerBreak
        },
        
        // Metadata
        lastUpdated: settings.lastUpdated,
        updatedBy: settings.updatedBy,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error updating settings:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Subdomain already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getTodayRequests,
  submitFoodRequest,
  toggleFoodRequests,
  getSettings,
  updateMealSettings,
  getMealsSummary,
  toggleEmailReports,
  updateSettings
};