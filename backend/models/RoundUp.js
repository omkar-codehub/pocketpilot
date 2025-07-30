const mongoose = require('mongoose');
const roundUpSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        required: true
    },
    addedAmount: {
        type: Number,
        required: true,
        min: 0
    }
}, {
    timestamps: true
});
module.exports = mongoose.model('RoundUp', roundUpSchema);
