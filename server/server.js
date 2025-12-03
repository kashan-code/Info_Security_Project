// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors()); // Enable CORS for frontend
app.use(express.json({ limit: '50mb' })); // Parse JSON bodies with larger limit for file uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Parse URL-encoded bodies

// Logging middleware (simple request logger)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const keyExchangeRoutes = require('./routes/keyExchangeRoutes');
const messageRoutes = require('./routes/messageRoutes');
const debugRoutes = require('./routes/debugRoutes');


// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/key-exchange', keyExchangeRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/debug', debugRoutes);

// Health check route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Secure Messaging API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      keyExchange: '/api/key-exchange',
      messages: '/api/messages',
      files: '/api/files', // ✨ NEW
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('=================================');
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('✓ MongoDB Connected');
  console.log('✓ File Encryption: Enabled');
  console.log('=================================');
  console.log('Available Routes:');
  console.log('  POST   /api/auth/register');
  console.log('  POST   /api/auth/login');
  console.log('  POST   /api/key-exchange/initiate');
  console.log('  POST   /api/messages/send');
  console.log('  POST   /api/files/upload'); // ✨ NEW
  console.log('  GET    /api/files/session/:sessionId'); // ✨ NEW
  console.log('  GET    /api/files/download/:fileId'); // ✨ NEW
  console.log('=================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});