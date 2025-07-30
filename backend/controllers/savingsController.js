const Savings = require('../models/Savings');
const Transaction = require('../models/Transaction');

// @desc    Get all savings goals for a user
// @route   GET /api/savings
// @access  Private
exports.getSavingsGoals = async (req, res) => {
  try {
    // Filter by completion status if provided
    const completionFilter = req.query.completed ? { isCompleted: req.query.completed === 'true' } : {};
    
    // Build query
    const query = {
      user: req.user.id,
      ...completionFilter
    };

    // Execute query
    const savingsGoals = await Savings.find(query).sort({ targetDate: 1 });

    res.status(200).json({
      success: true,
      count: savingsGoals.length,
      data: savingsGoals
    });
  } catch (error) {
    console.error('Get savings goals error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get a single savings goal
// @route   GET /api/savings/:id
// @access  Private
exports.getSavingsGoal = async (req, res) => {
  try {
    const savingsGoal = await Savings.findById(req.params.id);

    if (!savingsGoal) {
      return res.status(404).json({
        success: false,
        message: 'Savings goal not found'
      });
    }

    // Make sure user owns the savings goal
    if (savingsGoal.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'User not authorized'
      });
    }

    res.status(200).json({
      success: true,
      data: savingsGoal
    });
  } catch (error) {
    console.error('Get savings goal error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Create a savings goal
// @route   POST /api/savings
// @access  Private
exports.createSavingsGoal = async (req, res) => {
  try {
    // Add user to request body
    req.body.user = req.user.id;
    console.log(req.body);
    const savingsGoal = await Savings.create(req.body);

    res.status(201).json({
      success: true,
      data: savingsGoal
    });
  } catch (error) {
    console.error('Create savings goal error:', error);
    
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

// @desc    Update a savings goal
// @route   PUT /api/savings/:id
// @access  Private
exports.updateSavingsGoal = async (req, res) => {
  try {
    let savingsGoal = await Savings.findById(req.params.id);

    if (!savingsGoal) {
      return res.status(404).json({
        success: false,
        message: 'Savings goal not found'
      });
    }

    // Make sure user owns the savings goal
    if (savingsGoal.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'User not authorized'
      });
    }

    // Check if goal is being marked as completed
    if (!savingsGoal.isCompleted && req.body.isCompleted) {
      // If completing the goal, set currentAmount to targetAmount
      req.body.currentAmount = savingsGoal.targetAmount;
    }

    savingsGoal = await Savings.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: savingsGoal
    });
  } catch (error) {
    console.error('Update savings goal error:', error);
    
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

// @desc    Delete a savings goal
// @route   DELETE /api/savings/:id
// @access  Private
exports.deleteSavingsGoal = async (req, res) => {
  try {
    const savingsGoal = await Savings.findById(req.params.id);

    if (!savingsGoal) {
      return res.status(404).json({
        success: false,
        message: 'Savings goal not found'
      });
    }

    // Make sure user owns the savings goal
    if (savingsGoal.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'User not authorized'
      });
    }

    await savingsGoal.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Delete savings goal error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update savings goal progress
// @route   PATCH /api/savings/:id/progress
// @access  Private
exports.updateProgress = async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an amount'
      });
    }

    let savingsGoal = await Savings.findById(req.params.id);

    if (!savingsGoal) {
      return res.status(404).json({
        success: false,
        message: 'Savings goal not found'
      });
    }

    // Make sure user owns the savings goal
    if (savingsGoal.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'User not authorized'
      });
    }

    // Calculate new current amount
    const newAmount = savingsGoal.currentAmount + parseFloat(amount);
    
    // Ensure amount doesn't go below 0
    if (newAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Current amount cannot go below 0'
      });
    }

    // Check if goal is now completed
    const isCompleted = newAmount >= savingsGoal.targetAmount;
    
    // Update the savings goal
    savingsGoal = await Savings.findByIdAndUpdate(
      req.params.id, 
      { 
        currentAmount: newAmount,
        isCompleted: isCompleted
      }, 
      {
        new: true,
        runValidators: true
      }
    );
    // add amount to transactions
    const transaction = new Transaction({
      user: req.user.id,
      type: 'expense',
      category: 'Savings',
      amount: parseFloat(amount),
      description: `Savings progress update for goal: ${savingsGoal.name}`,
      date: new Date()
    });
    await transaction.save();

    res.status(200).json({
      success: true,
      data: savingsGoal
    });
  } catch (error) {
    console.error('Update savings progress error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};