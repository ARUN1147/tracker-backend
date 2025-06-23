const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { putAttendance, getAttendance, getWorkerAttendance, putRfidAttendance } = require('../controllers/attendanceController');

const router = express.Router();

router.put('/', protect, putAttendance);
router.post('/', protect, getAttendance);
router.post('/rfid', putRfidAttendance);
router.post('/worker', protect, getWorkerAttendance);

module.exports = router;