const express = require('express');
const router = express.Router();
const otpController = require('../controllers/otpController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
// Route to send OTP
router.post('/send', otpController.sendOTP);

// Route to verify OTP
router.post('/verify', otpController.verifyOTP);

// Protected routes
// Route to send bulk OTPs
router.post('/bulk-send', protect, otpController.sendBulkOTP);

module.exports = router;
