const Transaction = require('../models/Transaction');
const {GoogleGenAI} = require('@google/genai'); // replace with your AI import

async function parseRegretFeedback(command) {
  // Prompt the AI to extract category, product keyword, regret notes
  const prompt = `
You are a financial assistant.

User says regret feedback like:
"I bought a Fitbit, used it for two days and then stopped, I regret buying it."

Extract:
- category (from your strict list)
- product keyword (main item name)
- regret notes (brief reason or sentiment)

Response as JSON:
{
  "category": "Shopping",
  "productKeyword": "Fitbit",
  "notes": "used it for two days then stopped, regret buying"
}

User message: "${command}"
`;

  const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
  const response = await genAI.models.generateContent({model: "gemini-2.0-flash", contents: prompt});
  const text = response.text;

  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}') + 1;
  const jsonString = text.slice(jsonStart, jsonEnd);
//  console.log('AI response:', jsonString);
  try {
    return JSON.parse(jsonString);
  } catch (err) {
    throw new Error('Failed to parse regret feedback AI response');
  }
}

exports.addRegretFeedback = async (req, res) => {
  try {
    // console.log('Received regret feedback command:', req.body);
    
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({ success: false, message: "Please provide regret feedback command" });
    }

    const parsedData = await parseRegretFeedback(command);

    if (!parsedData.category || !parsedData.productKeyword) {
      return res.status(400).json({ success: false, message: "Invalid regret feedback data" });
    }

    // Find the most recent matching transaction for this user
    const transaction = await Transaction.findOne({
      user: req.user.id,
      category: parsedData.category,
      description: { $regex: parsedData.productKeyword, $options: 'i' }
    }).sort({ date: -1 });
    console.log('Matching transaction:', transaction);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Matching transaction not found' });
    }

    transaction.regretFeedback = true;
    transaction.regretNotes = parsedData.notes || '';
    await transaction.save();

    res.status(200).json({ success: true, message: 'Regret feedback saved', data: transaction });
  } catch (error) {
    console.error('Regret feedback error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getRegretFeedback = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      user: req.user.id,
      regretFeedback: false,
      type: 'expense'

    }).sort({ date: -1 });
    
    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    console.error('Get regret feedback error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.addRegretFeedbackToTransaction = async (req, res) => {
  try {
    const { transactionId, notes } = req.body;
    console.log('Adding regret feedback to transaction:', transactionId, notes);
    
    if (!transactionId || !notes) {
      return res.status(400).json({ success: false, message: 'Transaction ID and notes are required' });
    }

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Ensure the user owns the transaction
    if (transaction.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'User not authorized' });
    }

    transaction.regretFeedback = true;
    transaction.regretNotes = notes;
    await transaction.save();

    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    console.error('Add regret feedback to transaction error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};