// backend/routes/settingsRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getSettings,
  updateMealSettings,
  updateSettings
} = require('../controllers/foodRequestController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');

// Admin routes
router.put('/:subdomain/:mealType', protect, adminOnly, updateMealSettings);
router.put('/:subdomain', protect, adminOnly, updateSettings);
router.get('/:subdomain', protect, getSettings);

module.exports = router;