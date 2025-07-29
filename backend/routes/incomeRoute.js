const express = require('express');
const router = express.Router();
const incomeController = require('../controllers/incomeController');
const { protect } = require('../middleware/authMiddleware');

// All routes below require authentication
router.post('/', protect, incomeController.createIncome);
router.get('/', protect, incomeController.getAllIncome);
router.get('/:id', protect, incomeController.getIncomeById);
router.put('/:id', protect, incomeController.updateIncome);
router.delete('/:id', protect, incomeController.deleteIncome);

module.exports = router;
