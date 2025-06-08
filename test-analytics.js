require('dotenv').config();
const mongoose = require('mongoose');
const SmsLog = require('./models/smsLog');
const User = require('./models/user');
const connectDB = require('./config/db');

// Connect to database
connectDB();

// Create test data for user analytics
const createTestData = async () => {
  try {
    // First, check if we have any admin users
    const admin = await User.findOne({ role: 'admin' });
    
    if (!admin) {
      console.log('No admin user found. Please run createAdmin.js first.');
      process.exit(1);
    }
    
    console.log(`Found admin user: ${admin.name} (${admin.email})`);
    
    // Check if we already have SMS logs for this user
    const existingLogs = await SmsLog.countDocuments({ user: admin._id });
    
    if (existingLogs > 0) {
      console.log(`Admin user already has ${existingLogs} SMS logs. Skipping test data creation.`);
      process.exit(0);
    }
    
    // Create some test SMS logs for the admin user
    const testData = [
      {
        phoneNumber: '+1234567890',
        status: 'delivered',
        messageType: 'otp',
        message: 'Your OTP code is: 123456',
        user: admin._id,
        createdAt: new Date()
      },
      {
        phoneNumber: '+0987654321',
        status: 'delivered',
        messageType: 'otp',
        message: 'Your OTP code is: 654321',
        user: admin._id,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        phoneNumber: '+1122334455',
        status: 'failed',
        messageType: 'otp',
        message: 'Your OTP code is: 112233',
        user: admin._id,
        errorMessage: 'Invalid phone number',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        phoneNumber: '+5566778899',
        status: 'delivered',
        messageType: 'bulk',
        message: 'Your OTP code is: 998877',
        user: admin._id,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      {
        phoneNumber: '+9988776655',
        status: 'delivered',
        messageType: 'bulk',
        message: 'Your OTP code is: 556677',
        user: admin._id,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
      }
    ];
    
    await SmsLog.insertMany(testData);
    
    console.log(`Created ${testData.length} test SMS logs for admin user.`);
    console.log('Now you can test the analytics API.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test data:', error);
    process.exit(1);
  }
};

createTestData(); 