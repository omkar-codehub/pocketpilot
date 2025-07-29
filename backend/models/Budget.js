// Budget.js
const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: Number,
    required: [true, 'Please specify month (1-12)'],
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: [true, 'Please specify year'],
    min: 2000,
    max: 2100
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: [
      'housing', 'food', 'transportation', 'utilities', 'entertainment', 
      'healthcare', 'education', 'shopping', 'debt', 'savings', 'other-expense'
    ]
  },
  amount: {
    type: Number,
    required: [true, 'Please add a budget amount'],
    min: 0
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Create compound index for user, month, year, and category to ensure uniqueness
BudgetSchema.index({ user: 1, month: 1, year: 1, category: 1 }, { unique: true });

// Create index for faster queries
BudgetSchema.index({ user: 1, year: 1, month: 1 });

module.exports = mongoose.model('Budget', BudgetSchema);