const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { giveBonus, resetSalary } = require('../controllers/salaryController');
const router = express.Router();

router.route('/give-bonus/:id').post(protect, giveBonus);
router.route('/reset-salary').post(protect, resetSalary);

module.exports = router;