const express = require('express');
const router = express.Router();
const { addRegretFeedback } = require('../controllers/regretFeedback');
const { protect } = require('../middleware/authMiddleware'); // middleware to authenticate user

// POST /api/regret-feedback
router.post('/', protect, addRegretFeedback);

module.exports = router;
