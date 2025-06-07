const express = require('express');
const router = express.Router();
const otpController = require('../controllers/otpController');

// Route to send OTP
router.post('/send', otpController.sendOTP);

// Route to verify OTP
router.post('/verify', otpController.verifyOTP);

// Route to send bulk OTPs
router.post('/bulk-send', otpController.sendBulkOTP);

module.exports = router;
