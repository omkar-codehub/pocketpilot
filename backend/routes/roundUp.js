const express = require('express');
const router = express.Router();
// Import controllers
const { getRoundUps, getTotalRoundUpAmount } = require('../controllers/roundUpController');
// Import middleware
const { protect } = require('../middleware/authMiddleware');
// Routes - all routes are protected
router.use(protect);
// Get all round-ups for the authenticated user
router.get('/', getRoundUps);
// Export the router
router.get('/total', getTotalRoundUpAmount)
module.exports = router;