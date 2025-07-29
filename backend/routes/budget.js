const express = require('express');
const router = express.Router();

// Import controllers (to be implemented)
const { 
  getBudget, 
  createBudget, 
  updateBudget, 
  deleteBudget,
  getBudgetByCategory,
  getBudgetAnalytics
} = require('../controllers/budgetController');

// Import middleware (to be implemented)
const { protect } = require('../middleware/authMiddleware');

// Routes - all routes are protected
router.use(protect);

router.route('/')
  .get(getBudget)
  .post(createBudget);

router.route('/:id')
  .put(updateBudget)
  .delete(deleteBudget);

router.get('/category/:category', getBudgetByCategory);
router.get('/analytics', getBudgetAnalytics);

module.exports = router;