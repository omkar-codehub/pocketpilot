const Income = require('../models/Income');
const mongoose = require('mongoose');
// Add new income
exports.createIncome = async (req, res) => {
  try {
    const { amount, source, date } = req.body;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ message: "Amount is required and must be a number." });
    }

    const income = new Income({
      user: req.user.id,
      amount,
      source,
      date: date || new Date()
    });

    await income.save();
    res.status(201).json(income);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all income entries for user
exports.getAllIncome = async (req, res) => {
  try {
    const income = await Income.find({ user: req.user.id }).sort({ date: -1 });
    res.json(income);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getTotalIncome = async (req, res) => {
  try {
    console.log('Calculating total income for user:');
    const totalIncome = await Income.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user._id)
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const total = totalIncome.length > 0 ? totalIncome[0].total : 0;

    res.status(200).json({ success: true, total });
  } catch (err) {
    console.error('Error getting total income:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};


// Get income by ID
exports.getIncomeById = async (req, res) => {
  try {
    const income = await Income.findOne({ _id: req.params.id, user: req.user.id });

    if (!income) return res.status(404).json({ message: 'Income not found' });

    res.json(income);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update income
exports.updateIncome = async (req, res) => {
  try {
    const { amount, source, date } = req.body;

    const updatedIncome = await Income.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { amount, source, date },
      { new: true }
    );

    if (!updatedIncome) return res.status(404).json({ message: 'Income not found' });

    res.json(updatedIncome);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete income
exports.deleteIncome = async (req, res) => {
  try {
    const deleted = await Income.findOneAndDelete({ _id: req.params.id, user: req.user.id });

    if (!deleted) return res.status(404).json({ message: 'Income not found' });

    res.json({ message: 'Income deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
