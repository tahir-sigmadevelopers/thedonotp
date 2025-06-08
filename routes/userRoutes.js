const express = require('express');
const router = express.Router();
const { createUser, loginUser, getUsers, deleteUser } = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', loginUser);

// Protected routes
router.post('/', protect, admin, createUser); // Only admin can create users
router.get('/', protect, admin, getUsers);    // Only admin can get all users
router.delete('/:id', protect, admin, deleteUser); // Only admin can delete users

module.exports = router; 