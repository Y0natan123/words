const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

// Import database initialization
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://your-frontend-url.vercel.app'] // Use environment variable
    : ['http://localhost:3000', 'http://localhost:3001'], // Development origins
  credentials: true
}));

app.use(express.json());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'your-session-secret-here',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Import routes
const wordsRoutes = require('./routes/words');
const aiRoutes = require('./routes/ai');
const { router: authRoutes } = require('./routes/auth');
const languagePairsRoutes = require('./routes/languagePairs');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/language-pairs', languagePairsRoutes);
app.use('/api/words', wordsRoutes);
app.use('/api/ai', aiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initDatabase();
    console.log('Database initialized successfully');
    
    if (process.env.NODE_ENV !== 'production') {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
};

startServer();

// Export for Vercel
module.exports = app; 