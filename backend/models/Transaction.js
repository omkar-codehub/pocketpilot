// Transaction.js
const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Please add a transaction amount']
  },
  type: {
    type: String,
    required: [true, 'Please specify transaction type'],
    enum: ['income', 'expense']
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: [
      'Salary', 'Investment', 'Freelance', 'Gift', 'other-income',
      'housing', 'Food', 'Transportation', 'utilities', 'Entertainment', 
      'Healthcare', 'Education', 'Shopping', 'Bills', 'savings', 'other-expense'
    ]
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  regretFeedback: {
  type: Boolean,
  default: false
  },
  regretNotes: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit-card', 'debit-card', 'bank-transfer', 'mobile-payment', 'other'],
    default: 'other'
  }
}, {
  timestamps: true
});

TransactionSchema.index({ user: 1, date: -1 });
TransactionSchema.index({ user: 1, category: 1 });
TransactionSchema.index({ user: 1, type: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);