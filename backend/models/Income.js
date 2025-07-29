//Income.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const incomeSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  source: { type: String },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Income', incomeSchema);
