const express = require('express');
const router = express.Router();
const { updateRoundUpPreference } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
// Routes
router.use(protect);
router.put('/round-up-preference', updateRoundUpPreference);
module.exports = router;