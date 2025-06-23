// backend/config/email.js
const nodemailer = require('nodemailer');

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate HTML email template for daily report
const generateDailyReportHTML = (reportData) => {
  const { subdomain, date, breakfast, lunch, dinner, totalCount } = reportData;
  
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generateMealSection = (mealData, mealName, color) => {
    if (mealData.count === 0) {
      return `
        <tr>
          <td style="padding: 20px; border-bottom: 1px solid #eee;">
            <h3 style="color: ${color}; margin: 0 0 10px 0; font-size: 18px;">
              ${mealName} (${mealData.count} requests)
            </h3>
            <p style="color: #666; margin: 0; font-style: italic;">No requests submitted</p>
          </td>
        </tr>
      `;
    }

    const requestRows = mealData.requests.map(req => `
      <tr style="border-bottom: 1px solid #f0f0f0;">
        <td style="padding: 8px; border-right: 1px solid #f0f0f0;">${req.workerName}</td>
        <td style="padding: 8px; border-right: 1px solid #f0f0f0;">${req.workerRfid}</td>
        <td style="padding: 8px; border-right: 1px solid #f0f0f0;">${req.department}</td>
        <td style="padding: 8px;">${formatTime(req.submittedAt)}</td>
      </tr>
    `).join('');

    return `
      <tr>
        <td style="padding: 20px; border-bottom: 1px solid #eee;">
          <h3 style="color: ${color}; margin: 0 0 15px 0; font-size: 18px;">
            ${mealName} (${mealData.count} requests)
          </h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd; border-radius: 5px;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 10px; text-align: left; border-right: 1px solid #ddd;">Name</th>
                <th style="padding: 10px; text-align: left; border-right: 1px solid #ddd;">Employee ID</th>
                <th style="padding: 10px; text-align: left; border-right: 1px solid #ddd;">Department</th>
                <th style="padding: 10px; text-align: left;">Submitted At</th>
              </tr>
            </thead>
            <tbody>
              ${requestRows}
            </tbody>
          </table>
        </td>
      </tr>
    `;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Daily Food Request Report</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
      <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Daily Food Request Report</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">${subdomain} - ${date}</p>
        </div>

        <!-- Summary Cards -->
        <div style="padding: 30px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 30px; gap: 15px;">
            <div style="flex: 1; background-color: #fff3cd; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #ffc107;">
              <h3 style="margin: 0 0 5px 0; color: #856404; font-size: 14px; text-transform: uppercase;">Breakfast</h3>
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #856404;">${breakfast.count}</p>
            </div>
            <div style="flex: 1; background-color: #d1ecf1; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #17a2b8;">
              <h3 style="margin: 0 0 5px 0; color: #0c5460; font-size: 14px; text-transform: uppercase;">Lunch</h3>
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #0c5460;">${lunch.count}</p>
            </div>
            <div style="flex: 1; background-color: #e2e3f1; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #6f42c1;">
              <h3 style="margin: 0 0 5px 0; color: #3d2465; font-size: 14px; text-transform: uppercase;">Dinner</h3>
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #3d2465;">${dinner.count}</p>
            </div>
            <div style="flex: 1; background-color: #d4edda; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #28a745;">
              <h3 style="margin: 0 0 5px 0; color: #155724; font-size: 14px; text-transform: uppercase;">Total</h3>
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #155724;">${totalCount}</p>
            </div>
          </div>

          <!-- Meal Details -->
          <table style="width: 100%; border-collapse: collapse; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            ${generateMealSection(breakfast, '🌅 Breakfast', '#ffc107')}
            ${generateMealSection(lunch, '🍽️ Lunch', '#17a2b8')}
            ${generateMealSection(dinner, '🌙 Dinner', '#6f42c1')}
          </table>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border-top: 1px solid #eee;">
          <p style="margin: 0; color: #6c757d; font-size: 14px;">
            This is an automated report generated by TaskTracker Food Management System
          </p>
          <p style="margin: 5px 0 0 0; color: #6c757d; font-size: 12px;">
            Generated on ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate HTML email template for meal-specific report
const generateMealReportHTML = (reportData) => {
  const { subdomain, mealType, date, totalCount, requests, closingTime } = reportData;
  
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const mealColors = {
    breakfast: '#ffc107',
    lunch: '#17a2b8',
    dinner: '#6f42c1'
  };

  const mealEmojis = {
    breakfast: '🌅',
    lunch: '🍽️',
    dinner: '🌙'
  };

  const requestRows = requests.map(req => `
    <tr style="border-bottom: 1px solid #f0f0f0;">
      <td style="padding: 12px; border-right: 1px solid #f0f0f0;">${req.workerName}</td>
      <td style="padding: 12px; border-right: 1px solid #f0f0f0;">${req.workerRfid}</td>
      <td style="padding: 12px; border-right: 1px solid #f0f0f0;">${req.department}</td>
      <td style="padding: 12px;">${formatTime(req.submittedAt)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Request Report</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
      <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background-color: ${mealColors[mealType]}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">
            ${mealEmojis[mealType]} ${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Request Report
          </h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">${subdomain} - ${date}</p>
          ${closingTime ? `<p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">Closed at ${closingTime}</p>` : ''}
        </div>

        <!-- Summary -->
        <div style="padding: 30px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
            <h2 style="margin: 0 0 10px 0; color: ${mealColors[mealType]}; font-size: 36px;">${totalCount}</h2>
            <p style="margin: 0; color: #6c757d; font-size: 16px;">Total ${mealType} requests received today</p>
          </div>

          ${totalCount > 0 ? `
            <!-- Requests Table -->
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background-color: ${mealColors[mealType]}; color: white;">
                  <th style="padding: 15px; text-align: left; border-right: 1px solid rgba(255,255,255,0.2);">Employee Name</th>
                  <th style="padding: 15px; text-align: left; border-right: 1px solid rgba(255,255,255,0.2);">Employee ID</th>
                  <th style="padding: 15px; text-align: left; border-right: 1px solid rgba(255,255,255,0.2);">Department</th>
                  <th style="padding: 15px; text-align: left;">Submitted At</th>
                </tr>
              </thead>
              <tbody>
                ${requestRows}
              </tbody>
            </table>
          ` : `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
              <p style="font-size: 18px; margin: 0;">No ${mealType} requests were submitted today.</p>
            </div>
          `}
        </div>

        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border-top: 1px solid #eee;">
          <p style="margin: 0; color: #6c757d; font-size: 14px;">
            This is an automated report generated by TaskTracker Food Management System
          </p>
          <p style="margin: 5px 0 0 0; color: #6c757d; font-size: 12px;">
            Generated on ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send food request report
const sendFoodRequestReport = async (recipients, reportData) => {
  try {
    const isDaily = reportData.breakfast !== undefined;
    const subject = isDaily 
      ? `Daily Food Request Report - ${reportData.subdomain} (${reportData.date})`
      : `${reportData.mealType.charAt(0).toUpperCase() + reportData.mealType.slice(1)} Request Report - ${reportData.subdomain} (${reportData.date})`;
    
    const html = isDaily 
      ? generateDailyReportHTML(reportData)
      : generateMealReportHTML(reportData);

    const mailOptions = {
      from: `"TaskTracker System" <${process.env.EMAIL_USER}>`,
      to: recipients.join(', '),
      subject: subject,
      html: html
    };

    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Test email connection
const testEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('Email service: Connected successfully');
    return true;
  } catch (error) {
    console.error('Email service: Connection failed:', error.message);
    return false;
  }
};

module.exports = {
  sendFoodRequestReport,
  testEmailConnection,
  generateDailyReportHTML,
  generateMealReportHTML
};