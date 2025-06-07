const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Get SMS analytics
router.get('/sms', analyticsController.getSMSAnalytics);

// Get daily SMS count
router.get('/sms/daily', analyticsController.getDailySMSCount);

module.exports = router; 