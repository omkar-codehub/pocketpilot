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
      'salary', 'investment', 'freelance', 'gift', 'other-income',
      'housing', 'food', 'transportation', 'utilities', 'entertainment', 
      'healthcare', 'education', 'shopping', 'debt', 'savings', 'other-expense'
    ]
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
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