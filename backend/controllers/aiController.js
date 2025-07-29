const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Savings = require('../models/Savings');
const geminiService = require('../services/geminiService');
const { GoogleGenAI } = require('@google/genai');
// @desc    Process voice commands
// @route   POST /api/ai/voice-command
// @access  Private
// Helper to parse product keyword from voice command using AI (simplified)
async function extractProductKeyword(command) {
  const prompt = `
You are a financial assistant.

Extract the main product/item name from this user message:
"${command}"

Respond with just the product keyword or short phrase.
`;

  const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
  const response = await genAI.models.generateContent({model: "gemini-2.0-flash", contents: prompt});
  return response.text.trim(); // assume clean product name
}

async function checkPreviousRegret(userId, category, productKeyword) {
  return await Transaction.findOne({
    user: userId,
    category,
    regretFeedback: true,
    description: { $regex: productKeyword, $options: 'i' }
  });
}

exports.processVoiceCommand = async (req, res) => {
  try {
    const { command, confirmRegret } = req.body;
    if (!command) {
      return res.status(400).json({ success: false, message: 'Please provide a voice command' });
    }

    // Categorize command as before (you already have this function)
    const categorizedData = await categorizeMessage(command);
    const { amount, category, paymentMethod, type } = categorizedData;

    if (typeof amount !== 'number' || !category) {
      return res.status(400).json({ success: false, message: 'Failed to extract amount or category' });
    }

    // Extract product keyword from command
    const productKeyword = await extractProductKeyword(command);

    // Check for regret feedback in previous transactions
    const regretTransaction = await checkPreviousRegret(req.user.id, category, productKeyword);

    if (regretTransaction && confirmRegret === undefined) {
      // Warn user about regret
      return res.status(200).json({
        success: true,
        regretWarning: true,
        message: `You reported regret for a similar purchase before ("${productKeyword}"). Are you sure you want to continue?`
      });
    }

    if (regretTransaction && confirmRegret === false) {
      return res.status(200).json({
        success: true,
        message: 'Transaction cancelled based on your regret feedback.'
      });
    }

    // Save transaction normally
    const transaction = new Transaction({
      user: req.user.id,
      amount: Math.abs(amount),
      type: type || 'expense',
      category,
      description: command,
      date: new Date(),
      paymentMethod: paymentMethod || 'other',
      regretFeedback: false,
      regretNotes: ''
    });

    await transaction.save();

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    console.error('Process voice command error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


async function categorizeMessage(message) {
  const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

  const prompt = `
You are a financial assistant for a budget planning website.

Given a user message like:
"I spent 100 for buying chocolate with cash"

Your task:
- Extract the amount (as a number, in any currency).
- Assign a category from the **strict list below**.

Valid categories:
- Salary
- Investment
- Freelance
- Gift
- other-income
- Housing
- Food
- Transportation
- utilities
- Entertainment
- Healthcare
- Education
- Shopping
- Bills
- savings
- other-expense

Valid payement methods:
- cash
- credit-card
- debit-card
- bank-transfer
- mobile-payment
- other

Valid types:
- income
- expense

Response Format (must be valid JSON):
{
  "amount": 100,
  "category": "Shopping",
  "paymentMethod": "cash",
  "type": "expense"
}

User message: "${message}"
`;

  const response = await genAI.models.generateContent({model: "gemini-2.0-flash", contents: prompt});
  const text = response.text;
  console.log('AI response:', text);
  try {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    const jsonString = text.slice(jsonStart, jsonEnd);
    console.log('Parsed JSON:', jsonString);
    const data = JSON.parse(jsonString);

    // Optional: Validate category on server side too
    const validCategories = [
      'Salary', 'Investment', 'Freelance', 'Gift', 'other-income',
      'housing', 'Food', 'Transportation', 'utilities', 'Entertainment',
      'Healthcare', 'Education', 'Shopping', 'debt', 'Savings', 'other-expense'
    ];

    if (!validCategories.includes(data.category)) {
      throw new Error("Invalid category");
    }

    return data;
  } catch (err) {
    console.error("Failed to parse Gemini response:", text, err);
    throw new Error("Invalid response from AI");
  }
}


// @desc    Get AI-powered financial insights
// @route   GET /api/ai/insights
// @access  Private
exports.getFinancialInsights = async (req, res) => {
  try {
    // Get current month and year
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    // Get previous month
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    
    // Get start and end date for current month
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0);
    
    // Get start and end date for previous month
    const prevStartDate = new Date(prevMonthYear, prevMonth - 1, 1);
    const prevEndDate = new Date(prevMonthYear, prevMonth, 0);
    
    // Get all transactions for current month
    const currentTransactions = await Transaction.find({
      user: req.user.id,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });
    
    // Get all transactions for previous month
    const prevTransactions = await Transaction.find({
      user: req.user.id,
      date: {
        $gte: prevStartDate,
        $lte: prevEndDate
      }
    });
    
    // Calculate total income and expenses for current month
    const currentIncome = currentTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const currentExpenses = currentTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Calculate total income and expenses for previous month
    const prevIncome = prevTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const prevExpenses = prevTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Calculate spending by category for current month
    const currentSpendingByCategory = {};
    currentTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        if (!currentSpendingByCategory[t.category]) {
          currentSpendingByCategory[t.category] = 0;
        }
        currentSpendingByCategory[t.category] += t.amount;
      });
    
    // Calculate spending by category for previous month
    const prevSpendingByCategory = {};
    prevTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        if (!prevSpendingByCategory[t.category]) {
          prevSpendingByCategory[t.category] = 0;
        }
        prevSpendingByCategory[t.category] += t.amount;
      });
    
    // Find top spending categories
    const topCategories = Object.entries(currentSpendingByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: currentExpenses > 0 ? (amount / currentExpenses) * 100 : 0
      }));
    
    // Generate insights
    const insights = [];
    
    // Income trend
    if (currentIncome > prevIncome) {
      const percentIncrease = ((currentIncome - prevIncome) / prevIncome) * 100;
      insights.push(`Your income has increased by ${percentIncrease.toFixed(1)}% compared to last month.`);
    } else if (currentIncome < prevIncome) {
      const percentDecrease = ((prevIncome - currentIncome) / prevIncome) * 100;
      insights.push(`Your income has decreased by ${percentDecrease.toFixed(1)}% compared to last month.`);
    }
    
    // Expense trend
    if (currentExpenses > prevExpenses) {
      const percentIncrease = ((currentExpenses - prevExpenses) / prevExpenses) * 100;
      insights.push(`Your expenses have increased by ${percentIncrease.toFixed(1)}% compared to last month.`);
    } else if (currentExpenses < prevExpenses) {
      const percentDecrease = ((prevExpenses - currentExpenses) / prevExpenses) * 100;
      insights.push(`Your expenses have decreased by ${percentDecrease.toFixed(1)}% compared to last month.`);
    }
    
    // Savings rate
    const currentSavingsRate = currentIncome > 0 ? ((currentIncome - currentExpenses) / currentIncome) * 100 : 0;
    if (currentSavingsRate > 20) {
      insights.push(`Great job! Your savings rate this month is ${currentSavingsRate.toFixed(1)}%.`);
    } else if (currentSavingsRate > 0) {
      insights.push(`Your savings rate this month is ${currentSavingsRate.toFixed(1)}%. Consider increasing your savings.`);
    } else {
      insights.push(`You're spending more than you earn this month. Consider reducing expenses.`);
    }
    
    // Category-specific insights
    for (const category in currentSpendingByCategory) {
      const current = currentSpendingByCategory[category];
      const previous = prevSpendingByCategory[category] || 0;
      
      if (current > previous * 1.2) { // 20% increase
        const percentIncrease = ((current - previous) / previous) * 100;
        insights.push(`Your spending on ${category} has increased by ${percentIncrease.toFixed(1)}% compared to last month.`);
      }
    }
    
    // Get all budgets for current month
    const budgets = await Budget.find({
      user: req.user.id,
      month: currentMonth,
      year: currentYear
    });
    
    // Budget warnings
    for (const budget of budgets) {
      const spent = currentSpendingByCategory[budget.category] || 0;
      const percentage = (spent / budget.amount) * 100;
      
      if (percentage >= 90) {
        insights.push(`You've used ${percentage.toFixed(1)}% of your ${budget.category} budget.`);
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        summary: {
          currentMonth: {
            income: currentIncome,
            expenses: currentExpenses,
            savings: currentIncome - currentExpenses,
            savingsRate: currentSavingsRate
          },
          previousMonth: {
            income: prevIncome,
            expenses: prevExpenses,
            savings: prevIncome - prevExpenses,
            savingsRate: prevIncome > 0 ? ((prevIncome - prevExpenses) / prevIncome) * 100 : 0
          },
          trends: {
            incomeChange: prevIncome > 0 ? ((currentIncome - prevIncome) / prevIncome) * 100 : 0,
            expenseChange: prevExpenses > 0 ? ((currentExpenses - prevExpenses) / prevExpenses) * 100 : 0
          }
        },
        topCategories,
        insights
      }
    });
  } catch (error) {
    console.error('Get financial insights error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Analyze purchase affordability using Gemini AI
// @route   POST /api/ai/affordability
// @access  Private
exports.analyzeAffordability = async (req, res) => {
  try {
    const { itemName, itemPrice, category } = req.body;
    
    if (!itemName || !itemPrice || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide itemName, itemPrice, and category'
      });
    }

    // Get current month and year
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    // Get all transactions for current month
    const transactions = await Transaction.find({
      user: req.user.id,
      date: {
        $gte: new Date(currentYear, currentMonth - 1, 1),
        $lte: new Date(currentYear, currentMonth, 0)
      }
    });
    
    // Calculate total income and expenses
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Calculate spending by category
    const spendingByCategory = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        if (!spendingByCategory[t.category]) {
          spendingByCategory[t.category] = 0;
        }
        spendingByCategory[t.category] += t.amount;
      });
    
    // Get budget for the category
    const budget = await Budget.findOne({
      user: req.user.id,
      category,
      month: currentMonth,
      year: currentYear
    });

    // Get savings goals
    const savingsGoals = await Savings.find({ user: req.user.id });
    
    // Get upcoming expenses (simplified - in a real app, this would be more sophisticated)
    const upcomingExpenses = [
      { name: 'Rent', amount: 150, dueDate: '2023-05-01' },
      { name: 'Electricity', amount: 100, dueDate: '2023-05-15' }
    ];
    
    // Prepare data for Gemini API
    const affordabilityRequest = {
      itemName,
      itemPrice,
      category,
      userBudget: {
        monthlyIncome: totalIncome,
        totalExpenses,
        categoryLimits: budget ? { [category]: budget.amount } : {},
        currentSpending: spendingByCategory
      },
      savingsGoals: savingsGoals.map(goal => ({
        name: goal.title,
        target: goal.targetAmount,
        current: goal.currentAmount,
        deadline: goal.targetDate
      })),
      upcomingExpenses
    };
    
    // Call Gemini API for affordability analysis
    const analysis = await geminiService.analyzeAffordability(affordabilityRequest);
    
    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Affordability analysis error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Predict purchase regret using Gemini AI
// @route   POST /api/ai/regret-radar
// @access  Private
exports.predictRegret = async (req, res) => {
  try {
    const { itemName, itemPrice, category, currentMood } = req.body;
    
    if (!itemName || !itemPrice || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide itemName, itemPrice, and category'
      });
    }

    // Get past purchases with regret data (simplified - in a real app, this would come from a database)
    const pastPurchases = [
      { item: 'Designer Shoes', amount: 12000, regretScore: 8, reasonForRegret: 'Barely wore them, too uncomfortable' },
      { item: 'Smartphone', amount: 45000, regretScore: 2, reasonForRegret: 'Great value, use it every day' },
      { item: 'Gym Membership', amount: 15000, regretScore: 9, reasonForRegret: 'Only went twice, waste of money' },
      { item: 'Headphones', amount: 8000, regretScore: 1, reasonForRegret: 'Use them daily, excellent purchase' }
    ];
    
    // Recent behavior data (simplified)
    const recentBehavior = {
      budgetOverruns: 2,
      impulsePurchases: 3,
      purchaseFrequency: 'increasing'
    };
    
    // Spending patterns (simplified)
    const spendingPatterns = {
      impulsiveBuying: {
        timeOfDay: ['evening', 'late night'],
        triggers: ['stress', 'social media', 'sales'],
        averageAmount: 5000
      }
    };
    
    // Prepare data for Gemini API
    const regretRequest = {
      itemName,
      itemPrice,
      category,
      pastPurchases,
      currentMood: currentMood || 'neutral',
      recentBehavior,
      spendingPatterns
    };
    
    // Call Gemini API for regret prediction
    const prediction = await geminiService.predictRegret(regretRequest);
    
    res.status(200).json({
      success: true,
      data: prediction
    });
  } catch (error) {
    console.error('Regret prediction error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Analyze overspending patterns using Gemini AI
// @route   POST /api/ai/overspending
// @access  Private
exports.analyzeOverspending = async (req, res) => {
  try {
    // Get current month and year
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    // Get all budgets for current month
    const budgets = await Budget.find({
      user: req.user.id,
      month: currentMonth,
      year: currentYear
    });
    
    // Get all transactions for current month
    const transactions = await Transaction.find({
      user: req.user.id,
      date: {
        $gte: new Date(currentYear, currentMonth - 1, 1),
        $lte: new Date(currentYear, currentMonth, 0)
      }
    });
    
    // Calculate spending by category
    const spendingByCategory = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        if (!spendingByCategory[t.category]) {
          spendingByCategory[t.category] = 0;
        }
        spendingByCategory[t.category] += t.amount;
      });
    
    // Calculate days left in month
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const daysLeft = daysInMonth - today.getDate();
    
    // Prepare monthly budgets data
    const monthlyBudgets = {};
    budgets.forEach(budget => {
      const spent = spendingByCategory[budget.category] || 0;
      monthlyBudgets[budget.category] = {
        budget: budget.amount,
        spent,
        remaining: budget.amount - spent,
        daysLeft
      };
    });
    
    // Calculate spending velocity (simplified)
    const daysPassed = daysInMonth - daysLeft;
    const spendingVelocity = {};
    
    Object.entries(spendingByCategory).forEach(([category, spent]) => {
      const dailyAverage = daysPassed > 0 ? spent / daysPassed : spent;
      const projectedMonthEnd = spent + (dailyAverage * daysLeft);
      
      spendingVelocity[category] = {
        dailyAverage,
        projectedMonthEnd
      };
    });
    
    // Spending triggers (simplified)
    const triggers = {
      'food': ['weekends', 'social events'],
      'entertainment': ['boredom', 'friends'],
      'shopping': ['sales', 'stress relief']
    };
    
    // Prepare data for Gemini API
    const overspendingData = {
      monthlyBudgets,
      spendingVelocity,
      triggers
    };
    
    // Call Gemini API for overspending analysis
    const analysis = await geminiService.analyzeOverspending(overspendingData);
    
    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Overspending analysis error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Optimize savings with round-up strategies using Gemini AI
// @route   POST /api/ai/savings-optimizer
// @access  Private
exports.optimizeSavings = async (req, res) => {
  try {
    // Get current round-up data (simplified)
    const currentRoundUps = {
      dailyAverage: 15,
      monthlyTotal: 450,
      yearProjection: 5400
    };
    
    // Get spending patterns (simplified)
    const spendingPatterns = {
      smallPurchases: 45,  // per month
      mediumPurchases: 20, // per month
      largePurchases: 5    // per month
    };
    
    // Get savings goals
    const savingsGoals = await Savings.find({ user: req.user.id });
    
    // Format savings goals for Gemini API
    const formattedGoals = {};
    savingsGoals.forEach(goal => {
      formattedGoals[goal.title] = {
        target: goal.targetAmount,
        current: goal.currentAmount,
        deadline: goal.targetDate
      };
    });
    
    // Round-up settings (simplified)
    const roundUpSettings = {
      current: 'next₹5',
      options: ['next₹1', 'next₹5', 'next₹10', 'next₹50', 'next₹100']
    };
    
    // Prepare data for Gemini API
    const savingsData = {
      currentRoundUps,
      spendingPatterns,
      savingsGoals: formattedGoals,
      roundUpSettings
    };
    
    // Call Gemini API for savings optimization
    const optimization = await geminiService.optimizeSavings(savingsData);
    
    res.status(200).json({
      success: true,
      data: optimization
    });
  } catch (error) {
    console.error('Savings optimization error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Simulate what-if scenarios
// @route   POST /api/ai/simulate
// @access  Private
// exports.simulateScenario = async (req, res) => {
//   try {
//     const { amount, category, type } = req.body;
    
//     if (!amount || !category || !type) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide amount, category, and type (income/expense)'
//       });
//     }
    
//     // Get current month and year
//     const today = new Date();
//     const currentMonth = today.getMonth() + 1;
//     const currentYear = today.getFullYear();
    
//     // Get start and end date for current month
//     const startDate = new Date(currentYear, currentMonth - 1, 1);
//     const endDate = new Date(currentYear, currentMonth, 0);
    
//     // Get all transactions for current month
//     const transactions = await Transaction.find({
//       user: req.user.id,
//       date: {
//         $gte: startDate,
//         $lte: endDate
//       }
//     });
    
//     // Calculate total income and expenses
//     const totalIncome = transactions
//       .filter(t => t.type === 'income')
//       .reduce((sum, t) => sum + t.amount, 0);
      
//     const totalExpenses = transactions
//       .filter(t => t.type === 'expense')
//       .reduce((sum, t) => sum + t.amount, 0);
    
//     // Calculate spending by category
//     const spendingByCategory = {};
//     transactions
//       .filter(t => t.type === 'expense')
//       .forEach(t => {
//         if (!spendingByCategory[t.category]) {
//           spendingByCategory[t.category] = 0;
//         }
//         spendingByCategory[t.category] += t.amount;
//       });
    
//     // Get budget for the category
//     const budget = await Budget.findOne({
//       user: req.user.id,
//       category,
//       month: currentMonth,
//       year: currentYear
//     });
    
//     // Simulate the scenario
//     let simulation = {
//       currentState: {
//         totalIncome,
//         totalExpenses,
//         savings: totalIncome - totalExpenses,
//         savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0
//       },
//       afterChange: {}
//     };
    
//     if (type === 'income') {
//       simulation.afterChange = {
//         totalIncome: totalIncome + amount,
//         totalExpenses,
//         savings: (totalIncome + amount) - totalExpenses,
//         savingsRate: (totalIncome + amount) > 0 ? (((totalIncome + amount) - totalExpenses) / (totalIncome + amount)) * 100 : 0
//       };
//     } else { // expense
//       simulation.afterChange = {
//         totalIncome,
//         totalExpenses: totalExpenses + amount,
//         savings: totalIncome - (totalExpenses + amount),
//         savingsRate: totalIncome > 0 ? ((totalIncome - (totalExpenses + amount)) / totalIncome) * 100 : 0
//       };
      
//       // Add category-specific impact
//       const currentCategorySpending = spendingByCategory[category] || 0;
//       simulation.categoryImpact = {
//         category,
//         current: currentCategorySpending,
//         after: currentCategorySpending + amount,
//         percentageIncrease: currentCategorySpending > 0 ? (amount / currentCategorySpending) * 100 : 100
//       };
      
//       // Add budget impact if budget exists
//       if (budget) {
//         const currentPercentage = (currentCategorySpending / budget.amount) * 100;
//         const afterPercentage = ((currentCategorySpending + amount) / budget.amount) * 100;
        
//         simulation.budgetImpact = {
//           budgetAmount: budget.amount,
//           currentSpending: currentCategorySpending,
//           afterSpending: currentCategorySpending + amount,
//           currentPercentage,
//           afterPercentage,
//           willExceedBudget: afterPercentage > 100
//         };
//       }
//     }
    
//     // Generate recommendations
//     const recommendations = [];
    
//     if (type === 'expense') {
//       // Check if this would put them over budget
//       if (simulation.budgetImpact && simulation.budgetImpact.willExceedBudget) {
//         recommendations.push(`This expense would put you over your ${category} budget for the month.`);
//       }
      
//       // Check if this would make them spend more than they earn
//       if (simulation.afterChange.savings < 0) {
//         recommendations.push('This expense would cause you to spend more than you earn this month.');
//       }
      
//       // Check if this would significantly reduce savings rate
//       if (simulation.currentState.savingsRate - simulation.afterChange.savingsRate > 5) {
//         recommendations.push(`This expense would reduce your savings rate by ${(simulation.currentState.savingsRate - simulation.afterChange.savingsRate).toFixed(1)}%.`);
//       }
//     }
    
//     res.status(200).json({
//       success: true,
//       data: {
//         simulation,
//         recommendations
//       }
//     });
//   } catch (error) {
//     console.error('Simulate scenario error:', error);
//     res.status(500).json({ success: false, message: 'Server error', error: error.message });
//   }
// };