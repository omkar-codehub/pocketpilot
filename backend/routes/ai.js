const express = require('express');
const router = express.Router();

// Import controllers
const { 
  processVoiceCommand,
  getFinancialInsights,
  simulateScenario,
  analyzeAffordability,
  predictRegret,
  analyzeOverspending,
  optimizeSavings,
  chatWithAI
} = require('../controllers/aiController');

// Import middleware (to be implemented)
const { protect } = require('../middleware/authMiddleware');

// Routes - all routes are protected
router.use(protect);

// Process voice commands
router.post('/voice-command', processVoiceCommand);

// Get AI-powered financial insights
router.get('/insights', getFinancialInsights);

// Simulate what-if scenarios
// router.post('/simulate', simulateScenario);

// Analyze purchase affordability
router.post('/affordability', analyzeAffordability);

// Predict purchase regret
// router.post('/regret-radar', predictRegret);

// Analyze overspending patterns
router.post('/overspending', analyzeOverspending);

// Optimize savings with round-up strategies
// router.post('/savings-optimizer', optimizeSavings);
router.post('/chat', chatWithAI);
module.exports = router;