// backend/services/foodRequestReportService.js
const FoodRequest = require('../models/FoodRequest');
const Settings = require('../models/Settings');
const Admin = require('../models/Admin');
const EmailLog = require('../models/EmailLog');
const { sendFoodRequestReport } = require('../config/email');

// In-memory store to prevent duplicate emails within the same day
const emailSentTracker = new Map();

// Generate key for email tracking
const generateEmailKey = (subdomain, mealType, date) => {
  const dateStr = date.toDateString();
  return `${subdomain}-${mealType}-${dateStr}`;
};

// Check if email was already sent for this meal today
const wasEmailAlreadySent = (subdomain, mealType) => {
  const today = new Date();
  const key = generateEmailKey(subdomain, mealType, today);
  return emailSentTracker.has(key);
};

// Mark email as sent
const markEmailAsSent = (subdomain, mealType) => {
  const today = new Date();
  const key = generateEmailKey(subdomain, mealType, today);
  emailSentTracker.set(key, Date.now());
  
  // Clean up old entries (older than 25 hours)
  const cutoffTime = Date.now() - (25 * 60 * 60 * 1000);
  for (const [trackingKey, timestamp] of emailSentTracker.entries()) {
    if (timestamp < cutoffTime) {
      emailSentTracker.delete(trackingKey);
    }
  }
};

// Generate meal-specific report data
const generateMealReportData = async (subdomain, mealType) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const requests = await FoodRequest.find({
      subdomain,
      mealType,
      date: { $gte: today, $lt: tomorrow }
    }).populate('worker', 'name rfid department').populate('department', 'name');

    return {
      subdomain,
      mealType,
      date: today.toDateString(),
      totalCount: requests.length,
      closingTime: new Date().toLocaleTimeString('en-US', { 
        hour12: true, 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      requests: requests.map(req => ({
        workerName: req.worker?.name || 'Unknown',
        workerRfid: req.worker?.rfid || 'Unknown',
        department: req.department?.name || 'Unknown',
        submittedAt: req.date
      }))
    };
  } catch (error) {
    console.error('Error generating meal report data:', error);
    throw error;
  }
};

// Get admin emails for a subdomain
const getAdminEmails = async (subdomain) => {
  try {
    const admins = await Admin.find({ subdomain }).select('email');
    return admins.map(admin => admin.email).filter(email => email);
  } catch (error) {
    console.error('Error fetching admin emails:', error);
    return [];
  }
};

// Send meal-specific report when closing time is reached
const sendMealReportForOrganization = async (subdomain, mealType) => {
  try {
    // Check if email was already sent for this meal today
    if (wasEmailAlreadySent(subdomain, mealType)) {
      return { success: false, reason: `${mealType} email already sent today` };
    }

    const reportData = await generateMealReportData(subdomain, mealType);
    const adminEmails = await getAdminEmails(subdomain);
    
    if (adminEmails.length === 0) {
      return { success: false, reason: 'No admin emails found' };
    }

    const emailResult = await sendFoodRequestReport(adminEmails, reportData);
    markEmailAsSent(subdomain, mealType);

    // Log email
    await EmailLog.create({
      subdomain,
      emailType: `${mealType}_closing_report`,
      recipients: adminEmails,
      subject: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Report - ${subdomain} (Closed at ${reportData.closingTime})`,
      status: 'sent',
      messageId: emailResult.messageId,
      reportData,
      sentAt: new Date()
    });

    console.log(`${mealType} closing report sent for ${subdomain} - ${reportData.totalCount} requests`);
    return { success: true, emailResult, totalCount: reportData.totalCount };

  } catch (error) {
    console.error(`Error sending ${mealType} closing report for ${subdomain}:`, error);
    
    // Log failed email
    try {
      await EmailLog.create({
        subdomain,
        emailType: `${mealType}_closing_report`,
        recipients: [],
        subject: `${mealType} Closing Report (Failed)`,
        status: 'failed',
        errorMessage: error.message,
        sentAt: new Date()
      });
    } catch (logError) {
      console.error('Error logging failed email:', logError);
    }

    return { success: false, error: error.message };
  }
};

// Generate daily comprehensive report data
const generateReportData = async (subdomain) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [breakfastRequests, lunchRequests, dinnerRequests] = await Promise.all([
      FoodRequest.find({
        subdomain,
        mealType: 'breakfast',
        date: { $gte: today, $lt: tomorrow }
      }).populate('worker', 'name rfid department').populate('department', 'name'),
      
      FoodRequest.find({
        subdomain,
        mealType: 'lunch',
        date: { $gte: today, $lt: tomorrow }
      }).populate('worker', 'name rfid department').populate('department', 'name'),
      
      FoodRequest.find({
        subdomain,
        mealType: 'dinner',
        date: { $gte: today, $lt: tomorrow }
      }).populate('worker', 'name rfid department').populate('department', 'name')
    ]);

    const formatRequests = (requests) => requests.map(req => ({
      workerName: req.worker?.name || 'Unknown',
      workerRfid: req.worker?.rfid || 'Unknown',
      department: req.department?.name || 'Unknown',
      submittedAt: req.date
    }));

    return {
      subdomain,
      date: today.toDateString(),
      breakfast: {
        count: breakfastRequests.length,
        requests: formatRequests(breakfastRequests)
      },
      lunch: {
        count: lunchRequests.length,
        requests: formatRequests(lunchRequests)
      },
      dinner: {
        count: dinnerRequests.length,
        requests: formatRequests(dinnerRequests)
      },
      totalCount: breakfastRequests.length + lunchRequests.length + dinnerRequests.length
    };
  } catch (error) {
    console.error('Error generating daily report data:', error);
    throw error;
  }
};

// Send daily comprehensive report
const sendDailyReportForOrganization = async (subdomain) => {
  try {
    const settings = await Settings.findOne({ subdomain });
    if (!settings || !settings.emailReportsEnabled) {
      return { success: false, reason: 'Email reports disabled' };
    }

    const reportData = await generateReportData(subdomain);
    
    if (reportData.totalCount === 0) {
      return { success: false, reason: 'No requests to report' };
    }

    const adminEmails = await getAdminEmails(subdomain);
    if (adminEmails.length === 0) {
      return { success: false, reason: 'No admin emails found' };
    }

    const emailResult = await sendFoodRequestReport(adminEmails, reportData);

    await EmailLog.create({
      subdomain,
      emailType: 'daily_comprehensive_report',
      recipients: adminEmails,
      subject: `Daily Food Request Summary - ${subdomain} (${reportData.date})`,
      status: 'sent',
      messageId: emailResult.messageId,
      reportData,
      sentAt: new Date()
    });

    return { success: true, emailResult };

  } catch (error) {
    console.error(`Error sending daily comprehensive report for ${subdomain}:`, error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  generateReportData,
  generateMealReportData,
  getAdminEmails,
  sendDailyReportForOrganization,
  sendMealReportForOrganization
};