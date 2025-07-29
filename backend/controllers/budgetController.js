const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

// @desc    Get all budgets for a user
// @route   GET /api/budget
// @access  Private
exports.getBudget = async (req, res) => {
  try {
    // Get month and year from query params or use current month/year
    const today = new Date();
    const month = parseInt(req.query.month) || today.getMonth() + 1; // JS months are 0-indexed
    const year = parseInt(req.query.year) || today.getFullYear();

    const budgets = await Budget.find({
      user: req.user.id,
      month,
      year
    });

    res.status(200).json({
      success: true,
      count: budgets.length,
      data: budgets
    });
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Create budget
// @route   POST /api/budget
// @access  Private
exports.createBudget = async (req, res) => {
  try {
    // Add user to request body
    req.body.user = req.user.id;
    
    // Check if budget for this category, month and year already exists
    const existingBudget = await Budget.findOne({
      user: req.user.id,
      category: req.body.category,
      month: req.body.month,
      year: req.body.year
    });

    if (existingBudget) {
      return res.status(400).json({
        success: false,
        message: 'Budget for this category and period already exists'
      });
    }
    
    const budget = await Budget.create(req.body);

    res.status(201).json({
      success: true,
      data: budget
    });
  } catch (error) {
    console.error('Create budget error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update budget
// @route   PUT /api/budget/:id
// @access  Private
exports.updateBudget = async (req, res) => {
  try {
    let budget = await Budget.findById(req.params.id);

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Make sure user owns budget
    if (budget.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'User not authorized'
      });
    }

    budget = await Budget.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: budget
    });
  } catch (error) {
    console.error('Update budget error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete budget
// @route   DELETE /api/budget/:id
// @access  Private
exports.deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Make sure user owns budget
    if (budget.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'User not authorized'
      });
    }

    await budget.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get budget by category
// @route   GET /api/budget/category/:category
// @access  Private
exports.getBudgetByCategory = async (req, res) => {
  try {
    // Get month and year from query params or use current month/year
    const today = new Date();
    const month = parseInt(req.query.month) || today.getMonth() + 1;
    const year = parseInt(req.query.year) || today.getFullYear();

    const budget = await Budget.findOne({
      user: req.user.id,
      category: req.params.category,
      month,
      year
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found for this category'
      });
    }

    res.status(200).json({
      success: true,
      data: budget
    });
  } catch (error) {
    console.error('Get budget by category error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get budget analytics with spending progress
// @route   GET /api/budget/analytics
// @access  Private
exports.getBudgetAnalytics = async (req, res) => {
  try {
    // Get month and year from query params or use current month/year
    const today = new Date();
    const month = parseInt(req.query.month) || today.getMonth() + 1;
    const year = parseInt(req.query.year) || today.getFullYear();

    // Get all budgets for the month/year
    const budgets = await Budget.find({
      user: req.user.id,
      month,
      year
    });

    // Get start and end date for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Get all expense transactions for the month
    const transactions = await Transaction.find({
      user: req.user.id,
      type: 'expense',
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });

    // Calculate spending by category
    const spendingByCategory = {};
    transactions.forEach(transaction => {
      if (!spendingByCategory[transaction.category]) {
        spendingByCategory[transaction.category] = 0;
      }
      spendingByCategory[transaction.category] += transaction.amount;
    });

    // Combine budget and spending data
    const analytics = budgets.map(budget => {
      const spent = spendingByCategory[budget.category] || 0;
      const remaining = budget.amount - spent;
      const percentage = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;
      
      return {
        category: budget.category,
        budgeted: budget.amount,
        spent,
        remaining,
        percentage,
        status: percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'good'
      };
    });

    // Calculate totals
    const totalBudgeted = budgets.reduce((acc, budget) => acc + budget.amount, 0);
    const totalSpent = Object.values(spendingByCategory).reduce((acc, amount) => acc + amount, 0);

    res.status(200).json({
      success: true,
      data: {
        analytics,
        summary: {
          totalBudgeted,
          totalSpent,
          remaining: totalBudgeted - totalSpent,
          percentage: totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0
        }
      }
    });
  } catch (error) {
    console.error('Get budget analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};