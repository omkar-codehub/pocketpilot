const express = require('express');
const router = express.Router();

// Import controllers (to be implemented)
const { register, login, getProfile, verifyToken } = require('../controllers/authController');

// Import middleware (to be implemented)
const { protect } = require('../middleware/authMiddleware');

// Routes
router.post('/register', register);
router.post('/login', login);
router.get('/profile', protect, getProfile);
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify user token and return user data
router.get('/verify-token', protect,verifyToken); 

module.exports = router;