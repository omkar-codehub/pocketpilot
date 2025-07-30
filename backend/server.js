const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
const incomeRoutes = require('./routes/incomeRoute');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // frontend origin
  credentials: true
}));
app.use(express.json());

// Connect to database
connectDB();

// Routes
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to the PocketPilot API' });
});
app.use('/api/auth', require('./routes/auth'));
app.use('/api/income', incomeRoutes);
app.use('/api/budgets', require('./routes/budget'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/savings', require('./routes/savings'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/regret-feedback', require('./routes/regretFeedback'));
app.use('/api/user', require('./routes/user'));
app.use('/api/round-ups', require('./routes/roundUp'));
// Default route
app.get('/', (req, res) => {
  res.send('PocketPilot API is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});