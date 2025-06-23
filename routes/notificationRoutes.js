const express = require('express');
const router = express.Router();
const {
  createNotification,
  readNotification,
  updateNotification,
  deleteNotification
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// Public route to get notifications by subdomain
router.get('/:subdomain', readNotification);

// Admin-protected routes
router.post('/', protect, createNotification);
router.put('/:id', protect, updateNotification);
router.delete('/:id', protect, deleteNotification);

module.exports = router;
