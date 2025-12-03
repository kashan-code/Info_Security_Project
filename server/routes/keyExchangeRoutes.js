// server/routes/keyExchangeRoutes.js
const express = require('express');
const router = express.Router();
const {
  initiateKeyExchange,
  getPendingExchanges,
  respondToKeyExchange,
  getExchangeStatus,
  getExchangeHistory,
} = require('../controllers/keyExchangeController');
const { protect } = require('../middleware/auth');

// All routes are protected (require authentication)
router.post('/initiate', protect, initiateKeyExchange);
router.get('/pending', protect, getPendingExchanges);
router.post('/respond', protect, respondToKeyExchange);
router.get('/status/:sessionId', protect, getExchangeStatus);
router.get('/history', protect, getExchangeHistory);

module.exports = router;