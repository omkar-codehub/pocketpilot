const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
const incomeRoutes = require('./routes/incomeRoute');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to database
connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/income', incomeRoutes);
app.use('/api/budget', require('./routes/budget'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/savings', require('./routes/savings'));

// Default route
app.get('/', (req, res) => {
  res.send('PocketPilot API is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});