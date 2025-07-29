const { GoogleGenAI } = require('@google/genai');
class GeminiAIService {
  constructor() {
    this.genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
    this.retryLimit = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Send a prompt to Gemini API with retry logic
   * @param {string} prompt - The prompt to send to Gemini
   * @returns {Promise<string>} - The response from Gemini
   */
  async generateContent(prompt) {
    let attempts = 0;
    
    while (attempts < this.retryLimit) {
      try {
        const response = await this.genAI.models.generateContent({model: "gemini-2.0-flash", contents: prompt});
        return response.text;
      } catch (error) {
        attempts++;
        console.error(`Gemini API error (attempt ${attempts}/${this.retryLimit}):`, error);
        
        if (attempts >= this.retryLimit) {
          throw new Error(`Failed to generate content after ${this.retryLimit} attempts: ${error.message}`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempts));
      }
    }
  }

  /**
   * Analyze purchase affordability
   * @param {Object} affordabilityRequest - The affordability request data
   * @returns {Promise<Object>} - The affordability analysis
   */
  async analyzeAffordability(affordabilityRequest) {
    const { 
      itemName, 
      itemPrice, 
      category, 
      userBudget, 
      savingsGoals, 
      upcomingExpenses 
    } = affordabilityRequest;

    const prompt = `
    You are a witty but caring financial advisor. Analyze this purchase request and provide a clear YES/NO answer with a memorable, slightly humorous tip.

    User Financial Snapshot:
    - Monthly Income: ₹${userBudget.monthlyIncome}
    - Current Expenses: ₹${userBudget.totalExpenses}
    - Available Budget: ₹${userBudget.monthlyIncome - userBudget.totalExpenses}
    - Item: ${itemName} (₹${itemPrice})
    - Category Budget: ₹${userBudget.categoryLimits[category] || 0} (Spent: ₹${userBudget.currentSpending[category] || 0})
    - Savings Goals: ${JSON.stringify(savingsGoals)}
    - Upcoming Bills: ${JSON.stringify(upcomingExpenses)}

    Rules:
    1. Start with clear "YES, you can afford this!" or "NO, this will hurt your wallet!"
    2. Give ONE specific, actionable tip
    3. Use relatable analogies or witty phrases like "Buy Now, Cry Later"
    4. Keep response under 100 words
    5. Be encouraging, not judgmental

    Response format:
    Decision: [YES/NO]
    Tip: [Your witty advice]
    Impact: [Brief explanation of financial impact]
    `;

    try {
      const response = await this.generateContent(prompt);
      return this.parseAffordabilityResponse(response);
    } catch (error) {
      console.error('Affordability analysis error:', error);
      return this.getFallbackAffordabilityResponse(affordabilityRequest);
    }
  }

  /**
   * Parse the affordability response from Gemini
   * @param {string} response - The raw response from Gemini
   * @returns {Object} - The parsed affordability analysis
   */
  parseAffordabilityResponse(response) {
    try {
      const lines = response.split('\n').filter(line => line.trim() !== '');
      
      const decisionLine = lines.find(line => line.startsWith('Decision:'));
      const tipLine = lines.find(line => line.startsWith('Tip:'));
      const impactLine = lines.find(line => line.startsWith('Impact:'));
      
      const decision = decisionLine ? decisionLine.replace('Decision:', '').trim().startsWith('YES') : false;
      const tip = tipLine ? tipLine.replace('Tip:', '').trim() : '';
      const impact = impactLine ? impactLine.replace('Impact:', '').trim() : '';
      
      return {
        decision,
        tip,
        impact,
        confidence: 0.85, // Default confidence
        alternatives: ["Wait 10 days", "Find a 20% cheaper alternative"]
      };
    } catch (error) {
      console.error('Error parsing affordability response:', error);
      return {
        decision: false,
        tip: "When in doubt, wait it out!",
        impact: "Unable to analyze impact accurately",
        confidence: 0.5,
        alternatives: ["Wait 10 days", "Find a 20% cheaper alternative"]
      };
    }
  }

  /**
   * Get a fallback affordability response when Gemini API fails
   * @param {Object} affordabilityRequest - The affordability request data
   * @returns {Object} - A fallback affordability analysis
   */
  getFallbackAffordabilityResponse(affordabilityRequest) {
    const { itemPrice, userBudget, category } = affordabilityRequest;
    
    // Simple affordability check based on available budget
    const availableBudget = userBudget.monthlyIncome - userBudget.totalExpenses;
    const categoryBudget = userBudget.categoryLimits[category] || 0;
    const categorySpent = userBudget.currentSpending[category] || 0;
    const categoryRemaining = categoryBudget - categorySpent;
    
    const canAfford = itemPrice <= availableBudget && itemPrice <= categoryRemaining;
    
    return {
      decision: canAfford,
      tip: canAfford ? "Looks affordable based on your current budget!" : "This might stretch your budget too thin.",
      impact: `This would use ${((itemPrice / availableBudget) * 100).toFixed(1)}% of your available budget.`,
      confidence: 0.6,
      alternatives: ["Wait until next month", "Look for a less expensive option"]
    };
  }

  /**
   * Predict regret for a purchase
   * @param {Object} regretRequest - The regret prediction request data
   * @returns {Promise<Object>} - The regret prediction
   */
  async predictRegret(regretRequest) {
    const { 
      itemName, 
      itemPrice, 
      category, 
      pastPurchases, 
      currentMood, 
      recentBehavior, 
      spendingPatterns 
    } = regretRequest;

    const prompt = `
    You are an empathetic financial psychologist. Predict if this purchase might lead to regret based on the user's history.

    Current Purchase Consideration:
    - Item: ${itemName} (₹${itemPrice})
    - Category: ${category}

    User's Regret History:
    ${pastPurchases.map(p => `- ${p.item} (₹${p.amount}): Regret level ${p.regretScore}/10 because "${p.reasonForRegret}"`).join('\n')}

    Current Context:
    - Mood: ${currentMood}
    - Recent budget overruns: ${recentBehavior.budgetOverruns}
    - Recent behavioral changes: ${JSON.stringify(recentBehavior)}

    Spending Triggers:
    - Vulnerable times: ${spendingPatterns.impulsiveBuying.timeOfDay.join(', ')}
    - Common triggers: ${spendingPatterns.impulsiveBuying.triggers.join(', ')}

    Task:
    1. Provide regret probability (Low/Medium/High)
    2. Reference a specific past similar experience
    3. Suggest an emotional alternative or waiting period
    4. Use empathetic but direct language

    Format:
    Regret Risk: [Low/Medium/High]
    Memory: [Reference to past similar purchase and outcome]
    Suggestion: [Alternative action or waiting period]
    Emotional Note: [Caring reminder about their feelings and goals]
    `;

    try {
      const response = await this.generateContent(prompt);
      return this.parseRegretResponse(response);
    } catch (error) {
      console.error('Regret prediction error:', error);
      return this.getFallbackRegretResponse(regretRequest);
    }
  }

  /**
   * Parse the regret prediction response from Gemini
   * @param {string} response - The raw response from Gemini
   * @returns {Object} - The parsed regret prediction
   */
  parseRegretResponse(response) {
    try {
      const lines = response.split('\n').filter(line => line.trim() !== '');
      
      const riskLine = lines.find(line => line.startsWith('Regret Risk:'));
      const memoryLine = lines.find(line => line.startsWith('Memory:'));
      const suggestionLine = lines.find(line => line.startsWith('Suggestion:'));
      const emotionalLine = lines.find(line => line.startsWith('Emotional Note:'));
      
      const regretRisk = riskLine ? riskLine.replace('Regret Risk:', '').trim() : 'MEDIUM';
      const memory = memoryLine ? memoryLine.replace('Memory:', '').trim() : '';
      const suggestion = suggestionLine ? suggestionLine.replace('Suggestion:', '').trim() : '';
      const emotionalNote = emotionalLine ? emotionalLine.replace('Emotional Note:', '').trim() : '';
      
      return {
        regretRisk,
        memory,
        suggestion,
        emotionalNote
      };
    } catch (error) {
      console.error('Error parsing regret response:', error);
      return {
        regretRisk: 'MEDIUM',
        memory: 'We couldn\'t analyze your past purchases accurately.',
        suggestion: 'Consider waiting 24 hours before making this purchase.',
        emotionalNote: 'Take a moment to reflect on whether this purchase aligns with your financial goals.'
      };
    }
  }

  /**
   * Get a fallback regret prediction when Gemini API fails
   * @param {Object} regretRequest - The regret prediction request data
   * @returns {Object} - A fallback regret prediction
   */
  getFallbackRegretResponse(regretRequest) {
    const { itemPrice, pastPurchases, spendingPatterns } = regretRequest;
    
    // Simple regret prediction based on past purchases and price
    const averageRegretScore = pastPurchases.reduce((sum, p) => sum + p.regretScore, 0) / pastPurchases.length;
    const isExpensive = itemPrice > spendingPatterns.impulsiveBuying.averageAmount * 1.5;
    
    let regretRisk = 'MEDIUM';
    if (averageRegretScore > 7 && isExpensive) {
      regretRisk = 'HIGH';
    } else if (averageRegretScore < 4 && !isExpensive) {
      regretRisk = 'LOW';
    }
    
    return {
      regretRisk,
      memory: 'Based on your past purchases, you tend to have mixed feelings about similar items.',
      suggestion: 'Consider waiting 48 hours before making this purchase to ensure it\'s not an impulse buy.',
      emotionalNote: 'Remember that lasting satisfaction comes from purchases that align with your values and goals.'
    };
  }

  /**
   * Analyze overspending patterns
   * @param {Object} overspendingData - The overspending analysis request data
   * @returns {Promise<Object>} - The overspending analysis
   */
  async analyzeOverspending(overspendingData) {
    const { monthlyBudgets, spendingVelocity, triggers } = overspendingData;

    const prompt = `
    You are a financial detective. Analyze this user's spending patterns and identify their biggest money leaks.

    Budget Analysis:
    ${Object.entries(monthlyBudgets).map(([category, data]) => 
      `${category}: ₹${data.spent}/₹${data.budget} (${((data.spent/data.budget)*100).toFixed(1)}% used, ${data.daysLeft} days left)`
    ).join('\n')}

    Spending Velocity:
    ${Object.entries(spendingVelocity).map(([category, data]) => 
      `${category}: ₹${data.dailyAverage}/day → Projected: ₹${data.projectedMonthEnd} by month-end`
    ).join('\n')}

    Spending Triggers:
    ${Object.entries(triggers).map(([category, triggerList]) => 
      `${category}: ${triggerList.join(', ')}`
    ).join('\n')}

    Tasks:
    1. Identify top 3 overspending categories
    2. Predict which categories will exceed budget by month-end
    3. Suggest specific, actionable interventions
    4. Create a "spending personality" insight

    Format:
    Critical Categories: [List top 3 with overspend amounts]
    Month-End Predictions: [Categories likely to exceed budget]
    Quick Fixes: [3 specific actions to take this week]
    Spending Personality: [One-line insight about their spending style]
    Success Metric: [How much they could save with these changes]
    `;

    try {
      const response = await this.generateContent(prompt);
      return this.parseOverspendingResponse(response);
    } catch (error) {
      console.error('Overspending analysis error:', error);
      return this.getFallbackOverspendingResponse(overspendingData);
    }
  }

  /**
   * Parse the overspending analysis response from Gemini
   * @param {string} response - The raw response from Gemini
   * @returns {Object} - The parsed overspending analysis
   */
  parseOverspendingResponse(response) {
    try {
      const lines = response.split('\n').filter(line => line.trim() !== '');
      
      const criticalLine = lines.find(line => line.startsWith('Critical Categories:'));
      const predictionsLine = lines.find(line => line.startsWith('Month-End Predictions:'));
      const fixesLine = lines.find(line => line.startsWith('Quick Fixes:'));
      const personalityLine = lines.find(line => line.startsWith('Spending Personality:'));
      const metricLine = lines.find(line => line.startsWith('Success Metric:'));
      
      const criticalCategories = criticalLine ? criticalLine.replace('Critical Categories:', '').trim() : '';
      const monthEndPredictions = predictionsLine ? predictionsLine.replace('Month-End Predictions:', '').trim() : '';
      const quickFixes = fixesLine ? fixesLine.replace('Quick Fixes:', '').trim() : '';
      const spendingPersonality = personalityLine ? personalityLine.replace('Spending Personality:', '').trim() : '';
      const successMetric = metricLine ? metricLine.replace('Success Metric:', '').trim() : '';
      
      return {
        criticalCategories,
        monthEndPredictions,
        quickFixes,
        spendingPersonality,
        successMetric
      };
    } catch (error) {
      console.error('Error parsing overspending response:', error);
      return {
        criticalCategories: 'Unable to determine critical categories',
        monthEndPredictions: 'Unable to make accurate predictions',
        quickFixes: 'Review your recent transactions and identify unnecessary expenses',
        spendingPersonality: 'Your spending patterns need more data for accurate analysis',
        successMetric: 'Potential savings unknown'
      };
    }
  }

  /**
   * Get a fallback overspending analysis when Gemini API fails
   * @param {Object} overspendingData - The overspending analysis request data
   * @returns {Object} - A fallback overspending analysis
   */
  getFallbackOverspendingResponse(overspendingData) {
    const { monthlyBudgets, spendingVelocity } = overspendingData;
    
    // Find categories that are over budget or projected to be over budget
    const criticalCategories = [];
    const projectedOverBudget = [];
    
    for (const [category, data] of Object.entries(monthlyBudgets)) {
      const percentUsed = (data.spent / data.budget) * 100;
      if (percentUsed > 90) {
        criticalCategories.push(`${category} (₹${data.spent}/₹${data.budget}, ${percentUsed.toFixed(1)}%)`);
      }
      
      const velocity = spendingVelocity[category];
      if (velocity && velocity.projectedMonthEnd > data.budget) {
        projectedOverBudget.push(`${category} (Projected: ₹${velocity.projectedMonthEnd})`);
      }
    }
    
    return {
      criticalCategories: criticalCategories.length > 0 ? criticalCategories.join(', ') : 'No critical categories detected',
      monthEndPredictions: projectedOverBudget.length > 0 ? projectedOverBudget.join(', ') : 'No categories projected to exceed budget',
      quickFixes: 'Review your highest spending categories and look for unnecessary expenses. Consider setting spending alerts for categories close to their limits.',
      spendingPersonality: 'Your spending patterns suggest you may benefit from more detailed budget tracking.',
      successMetric: 'Staying within budget could save you 10-15% of your monthly expenses.'
    };
  }

  /**
   * Optimize savings with round-up strategies
   * @param {Object} savingsData - The savings optimization request data
   * @returns {Promise<Object>} - The savings optimization analysis
   */
  async optimizeSavings(savingsData) {
    const { 
      currentRoundUps, 
      spendingPatterns, 
      savingsGoals, 
      roundUpSettings 
    } = savingsData;

    const prompt = `
    You are a savings optimization expert. Help this user maximize their round-up savings potential.

    Current Savings Performance:
    - Daily round-ups: ₹${currentRoundUps.dailyAverage}
    - Monthly total: ₹${currentRoundUps.monthlyTotal}
    - Yearly projection: ₹${currentRoundUps.yearProjection}

    Purchase Patterns:
    - Small purchases (under ₹100): ${spendingPatterns.smallPurchases}/month
    - Medium purchases (₹100-500): ${spendingPatterns.mediumPurchases}/month  
    - Large purchases (above ₹500): ${spendingPatterns.largePurchases}/month

    Savings Goals:
    ${Object.entries(savingsGoals).map(([goal, data]) => 
      `${goal}: ₹${data.current}/₹${data.target} by ${data.deadline}`
    ).join('\n')}

    Current Setting: ${roundUpSettings.current}

    Tasks:
    1. Calculate potential savings with different round-up strategies
    2. Recommend optimal round-up setting for their goals
    3. Suggest "savings challenges" to boost round-ups
    4. Calculate goal achievement timeline with optimized settings

    Format:
    Optimization Potential: [How much more they could save annually]
    Recommended Setting: [Best round-up strategy with reasoning]
    Savings Challenge: [Weekly challenge to increase round-ups]
    Goal Timeline: [When they'll reach their goals with optimization]
    Micro-Investment Tip: [How to maximize the accumulated savings]
    `;

    try {
      const response = await this.generateContent(prompt);
      return this.parseSavingsResponse(response);
    } catch (error) {
      console.error('Savings optimization error:', error);
      return this.getFallbackSavingsResponse(savingsData);
    }
  }

  /**
   * Parse the savings optimization response from Gemini
   * @param {string} response - The raw response from Gemini
   * @returns {Object} - The parsed savings optimization
   */
  parseSavingsResponse(response) {
    try {
      const lines = response.split('\n').filter(line => line.trim() !== '');
      
      const potentialLine = lines.find(line => line.startsWith('Optimization Potential:'));
      const recommendedLine = lines.find(line => line.startsWith('Recommended Setting:'));
      const challengeLine = lines.find(line => line.startsWith('Savings Challenge:'));
      const timelineLine = lines.find(line => line.startsWith('Goal Timeline:'));
      const tipLine = lines.find(line => line.startsWith('Micro-Investment Tip:'));
      
      const optimizationPotential = potentialLine ? potentialLine.replace('Optimization Potential:', '').trim() : '';
      const recommendedSetting = recommendedLine ? recommendedLine.replace('Recommended Setting:', '').trim() : '';
      const savingsChallenge = challengeLine ? challengeLine.replace('Savings Challenge:', '').trim() : '';
      const goalTimeline = timelineLine ? timelineLine.replace('Goal Timeline:', '').trim() : '';
      const microInvestmentTip = tipLine ? tipLine.replace('Micro-Investment Tip:', '').trim() : '';
      
      return {
        optimizationPotential,
        recommendedSetting,
        savingsChallenge,
        goalTimeline,
        microInvestmentTip
      };
    } catch (error) {
      console.error('Error parsing savings response:', error);
      return {
        optimizationPotential: 'Unable to calculate optimization potential',
        recommendedSetting: 'Consider using the next₹10 round-up strategy',
        savingsChallenge: 'Try to make one fewer impulse purchase this week',
        goalTimeline: 'Unable to calculate accurate goal timeline',
        microInvestmentTip: 'Consider putting your round-up savings into a high-yield savings account'
      };
    }
  }

  /**
   * Get a fallback savings optimization when Gemini API fails
   * @param {Object} savingsData - The savings optimization request data
   * @returns {Object} - A fallback savings optimization
   */
  getFallbackSavingsResponse(savingsData) {
    const { currentRoundUps, spendingPatterns, roundUpSettings } = savingsData;
    
    // Calculate potential with next₹10 strategy (simple estimate)
    const smallTransactions = spendingPatterns.smallPurchases;
    const mediumTransactions = spendingPatterns.mediumPurchases;
    const totalTransactions = smallTransactions + mediumTransactions;
    
    // Estimate average round-up amount with next₹10 strategy
    const estimatedAvgRoundUp = 5; // Average of ₹0-₹9 round-up
    const potentialMonthly = totalTransactions * estimatedAvgRoundUp;
    const potentialYearly = potentialMonthly * 12;
    const currentYearly = currentRoundUps.monthlyTotal * 12;
    const additionalSavings = potentialYearly - currentYearly;
    
    return {
      optimizationPotential: `You could save approximately ₹${additionalSavings} more per year by optimizing your round-up strategy.`,
      recommendedSetting: `Consider switching from ${roundUpSettings.current} to the next₹10 round-up strategy for increased savings.`,
      savingsChallenge: 'Round up all purchases to the nearest ₹50 for one week to boost your savings.',
      goalTimeline: 'With optimized settings, you could reach your savings goals 15-20% faster.',
      microInvestmentTip: 'Consider automatically transferring your round-up savings to a separate high-yield savings account monthly.'
    };
  }
}

module.exports = new GeminiAIService();


// round-up strategies
// regret prediction
// affordability analysis
// overspending analysis
// savings optimization