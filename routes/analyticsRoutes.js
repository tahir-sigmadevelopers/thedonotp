const express = require('express');
const router = express.Router();
const { getSmsAnalytics, getDailySmsCount, getUserAnalytics } = require('../controllers/analyticsController');
const { protect, admin } = require('../middleware/authMiddleware');

// Test route for debugging authentication
router.get('/test', protect, (req, res) => {
  res.json({
    message: 'Authentication successful',
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Admin-only routes
router.get('/sms', protect, admin, getSmsAnalytics);
router.get('/sms/daily', protect, admin, getDailySmsCount);

// User routes - available to all authenticated users
router.get('/user', protect, getUserAnalytics);

module.exports = router; 