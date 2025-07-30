const User = require('../models/User');

exports.updateRoundUpPreference = async (req, res) => {
  try {
    const { roundUpEnabled } = req.body;

    // Validate input
    if (typeof roundUpEnabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Invalid input' });
    }

    // Update user's round-up preference
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { roundUpEnabled },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        roundUpEnabled: user.roundUpEnabled
      }
    });
  } catch (error) {
    console.error('Update round-up preference error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
}