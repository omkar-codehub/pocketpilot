const express = require('express');
const router = express.Router();
const { addRegretFeedback , addRegretFeedbackToTransaction, getRegretFeedback} = require('../controllers/regretFeedback');
const { protect } = require('../middleware/authMiddleware'); // middleware to authenticate user


router.get('/', protect, getRegretFeedback);
router.post('/', protect, addRegretFeedback);
router.post('/transaction', protect, addRegretFeedbackToTransaction);

module.exports = router;
