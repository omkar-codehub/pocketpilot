const RoundUp = require('../models/RoundUp');
const mongoose = require('mongoose');
exports.createRoundUp = async (transactionId, addedAmount, userId) => {
  try {
    // Create new round-up entry
    const roundUp = await RoundUp.create({
      user: userId,
      transaction: transactionId,
      addedAmount
    });
    await roundUp.save();

  } catch (error) {
    console.error('Create round-up error:', error);
  }
}

exports.getRoundUps = async (req, res) => {
  try {
    const roundUps = await RoundUp.find({ user: req.user.id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: roundUps.length,
      data: roundUps
    });
  } catch (error) {
    console.error('Get round-ups error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
}

exports.getTotalRoundUpAmount = async (req, res) => {
  try {
    const totalRoundUp = await RoundUp.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: null, total: { $sum: '$addedAmount' } } }
    ]);
    console.log('Total round-up amount:', totalRoundUp);
    res.status(200).json({
      success: true,
      total: totalRoundUp[0] ? totalRoundUp[0].total : 0
    });
  } catch (error) {
    console.error('Get total round-up amount error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
}