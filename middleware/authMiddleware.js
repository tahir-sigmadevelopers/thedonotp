const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Protect routes - verify token
const protect = async (req, res, next) => {
  let token;

  console.log('Authorization header:', req.headers.authorization);

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      console.log('Token from header:', token ? `${token.substring(0, 10)}...` : 'No token');

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallbacksecret');
      console.log('Decoded token:', decoded);

      // Get user from token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        console.log('User not found with ID:', decoded.id);
        return res.status(401).json({ message: 'User not found' });
      }
      
      console.log('Found user:', { id: user._id, email: user.email, role: user.role });
      
      // Set user in request
      req.user = user;
      next();
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed', error: error.message });
    }
  } else {
    console.log('No authorization header or incorrect format');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Admin middleware
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    console.log('Admin check passed for user:', req.user._id);
    next();
  } else {
    console.log('Admin check failed for user:', req.user ? req.user._id : 'No user');
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

module.exports = { protect, admin }; 