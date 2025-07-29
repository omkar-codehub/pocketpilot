// Savings.js

const mongoose = require('mongoose');

const SavingsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please add a name for your savings goal']
  },
  targetAmount: {
    type: Number,
    required: [true, 'Please add a target amount'],
    min: [1, 'Target amount must be at least 1']
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: [0, 'Current amount cannot be negative']
  },
  targetDate: {
    type: Date,
    required: [true, 'Please add a target date']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  notes: {
    type: String
  },
  isCompleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create index for faster queries
SavingsSchema.index({ user: 1, isCompleted: 1 });
SavingsSchema.index({ user: 1, targetDate: 1 });

module.exports = mongoose.model('Savings', SavingsSchema);