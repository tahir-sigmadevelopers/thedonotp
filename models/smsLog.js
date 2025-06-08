const mongoose = require('mongoose');

// Define SMS Log Schema
const smsLogSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'failed'],
    required: true,
  },
  messageType: {
    type: String,
    enum: ['otp', 'bulk', 'other'],
    default: 'otp',
  },
  message: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  errorMessage: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true, // Index for faster queries on date
  },
});

// Add indexes for common queries
smsLogSchema.index({ status: 1 });
smsLogSchema.index({ messageType: 1 });
smsLogSchema.index({ user: 1 });

module.exports = mongoose.model('SmsLog', smsLogSchema); 