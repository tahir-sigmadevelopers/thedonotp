const OTP = require('../models/otp');
const SmsLog = require('../models/smsLog');
const twilio = require('twilio');
const { Vonage } = require('@vonage/server-sdk');
require('dotenv').config();

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Initialize Vonage client
const vonage = new Vonage({
  apiKey: process.env.VONAGE_API_KEY || "c4da4f80",
  apiSecret: process.env.VONAGE_API_SECRET || "QD5qQOCqIAknhI5n"
});

// Generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to send SMS via Twilio
const sendTwilioSMS = async (phoneNumber, message) => {
  return twilioClient.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber,
  });
};

// Helper function to send SMS via Vonage
const sendVonageSMS = async (phoneNumber, message) => {
  const from = process.env.VONAGE_BRAND_NAME || "Vonage APIs";
  return vonage.sms.send({
    to: phoneNumber,
    from: from,
    text: message
  });
};

// Send OTP to phone number
exports.sendOTP = async (req, res) => {
  try {
    const { phoneNumber, provider = 'twilio' } = req.body;
    
    // Log authentication status for debugging
    console.log('Auth user in sendOTP:', req.user ? `User ID: ${req.user._id}` : 'No user authenticated');
    console.log('Using SMS provider:', provider);
    
    // Validate phone number
    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }
    
    // Generate new OTP
    const otp = generateOTP();
    
    // Save OTP to database
    await OTP.create({
      phoneNumber,
      otp,
    });
    
    // Create OTP message
    const message = `Your OTP verification code is: ${otp}. Valid for 5 minutes.`;
    
    // Send OTP via selected provider
    if (provider === 'vonage') {
      await sendVonageSMS(phoneNumber, message);
    } else {
      // Default to Twilio
      await sendTwilioSMS(phoneNumber, message);
    }
    
    // Log the successful SMS
    await SmsLog.create({
      phoneNumber,
      status: 'delivered',
      messageType: 'otp',
      message: message,
      provider: provider,
      user: req.user ? req.user._id : null
    });
    
    res.status(200).json({ 
      success: true, 
      message: 'OTP sent successfully' 
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    
    // Log the failed SMS
    await SmsLog.create({
      phoneNumber: req.body.phoneNumber,
      status: 'failed',
      messageType: 'otp',
      message: `OTP verification code. Valid for 5 minutes.`,
      provider: req.body.provider || 'twilio',
      errorMessage: error.message,
      user: req.user ? req.user._id : null
    });
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send OTP', 
      error: error.message 
    });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    
    // Validate input
    if (!phoneNumber || !otp) {
      return res.status(400).json({ message: 'Phone number and OTP are required' });
    }
    
    // Find the most recent OTP for this phone number
    const otpRecord = await OTP.findOne({ 
      phoneNumber 
    }).sort({ createdAt: -1 });
    
    // Check if OTP exists and matches
    if (!otpRecord) {
      return res.status(404).json({ 
        success: false, 
        message: 'OTP not found. Please request a new one.' 
      });
    }
    
    if (otpRecord.otp !== otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP. Please try again.' 
      });
    }
    
    // OTP is valid, delete it to prevent reuse
    await OTP.deleteOne({ _id: otpRecord._id });
    
    res.status(200).json({ 
      success: true, 
      message: 'OTP verified successfully' 
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify OTP', 
      error: error.message 
    });
  }
};

// Helper function to pause execution
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Send OTP in bulk
exports.sendBulkOTP = async (req, res) => {
  try {
    const { phoneNumbers, totalSMS, pauseAfter, pauseSeconds, provider = 'twilio' } = req.body;
    
    // Log authentication status for debugging
    console.log('Auth user in sendBulkOTP:', req.user ? `User ID: ${req.user._id}, Role: ${req.user.role}` : 'No user authenticated');
    
    console.log('Received bulk OTP request:', { 
      phoneNumbersCount: phoneNumbers?.length, 
      totalSMS, 
      pauseAfter, 
      pauseSeconds,
      provider
    });
    
    // Validate input
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone numbers array is required' 
      });
    }
    
    if (!totalSMS || totalSMS <= 0 || !pauseAfter || pauseAfter <= 0 || !pauseSeconds || pauseSeconds <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid totalSMS, pauseAfter, and pauseSeconds are required' 
      });
    }
    
    // Start processing in the background and return response immediately
    res.status(202).json({ 
      success: true, 
      message: 'Bulk OTP sending started',
      totalMessages: Math.min(totalSMS, phoneNumbers.length)
    });
    
    // Get user ID for logging
    const userId = req.user ? req.user._id : null;
    
    // Process in the background
    setTimeout(async () => {
      try {
        console.log(`Starting bulk OTP send: ${totalSMS} messages, pause after ${pauseAfter} for ${pauseSeconds} seconds using ${provider}`);
        console.log('Phone numbers to process:', phoneNumbers);
        
        let sentCount = 0;
        let batchCount = 0;
        
        // Loop through phone numbers and send OTPs
        for (let i = 0; i < Math.min(totalSMS, phoneNumbers.length); i++) {
          const phoneNumber = phoneNumbers[i % phoneNumbers.length]; // Cycle through available numbers
          
          try {
            // Generate new OTP
            const otp = generateOTP();
            console.log(`Generated OTP ${otp} for phone number ${phoneNumber}`);
            
            // Save OTP to database
            await OTP.create({
              phoneNumber,
              otp,
            });
            
            // Create OTP message
            const message = `Your OTP verification code is: ${otp}. Valid for 5 minutes.`;
            
            // Send OTP via selected provider
            if (provider === 'vonage') {
              await sendVonageSMS(phoneNumber, message);
            } else {
              // Default to Twilio
              await sendTwilioSMS(phoneNumber, message);
            }
            
            // Log the successful SMS
            await SmsLog.create({
              phoneNumber,
              status: 'delivered',
              messageType: 'bulk',
              message: message,
              provider: provider,
              user: userId
            });
            
            sentCount++;
            batchCount++;
            
            console.log(`Sent OTP ${sentCount}/${totalSMS} to ${phoneNumber} using ${provider}`);
            
            // Check if we need to pause
            if (batchCount >= pauseAfter && i < totalSMS - 1) {
              console.log(`Pausing for ${pauseSeconds} seconds after sending ${batchCount} messages`);
              await sleep(pauseSeconds * 1000);
              batchCount = 0;
            }
            
            // Small delay between individual messages to prevent rate limiting
            await sleep(100);
            
          } catch (error) {
            console.error(`Error sending OTP to ${phoneNumber}:`, error);
            
            // Log the failed SMS
            await SmsLog.create({
              phoneNumber,
              status: 'failed',
              messageType: 'bulk',
              message: `OTP verification code. Valid for 5 minutes.`,
              provider: provider,
              errorMessage: error.message,
              user: userId
            });
            
            // Continue with next number even if one fails
          }
        }
        
        console.log(`Bulk OTP sending completed. Sent ${sentCount}/${totalSMS} messages successfully.`);
      } catch (error) {
        console.error('Error in bulk OTP sending background process:', error);
      }
    }, 0);
    
  } catch (error) {
    console.error('Error starting bulk OTP send:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to start bulk OTP sending', 
      error: error.message 
    });
  }
};
