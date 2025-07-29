const express = require('express');
const router = express.Router();

// Import controllers (to be implemented)
const { register, login, getProfile } = require('../controllers/authController');

// Import middleware (to be implemented)
const { protect } = require('../middleware/authMiddleware');

// Routes
router.post('/register', register);
router.post('/login', login);
router.get('/profile', protect, getProfile);

module.exports = router;