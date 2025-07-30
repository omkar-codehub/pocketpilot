const express = require('express');
const router = express.Router();

// Import controllers (to be implemented)
const { 
  getTransactions, 
  addTransaction, 
  updateTransaction, 
  deleteTransaction,
  getTransactionsByCategory,
  getTransactionsByDate
} = require('../controllers/transactionController');

// Import middleware (to be implemented)
const { protect } = require('../middleware/authMiddleware');

// Routes - all routes are protected
router.use(protect);

router.route('/')
  .get(getTransactions)
  .post(addTransaction);
router.get('/w')
router.route('/:id')
  .put(updateTransaction)
  .delete(deleteTransaction);

router.get('/category/:category', getTransactionsByCategory);
router.get('/date/:startDate/:endDate', getTransactionsByDate);

module.exports = router;