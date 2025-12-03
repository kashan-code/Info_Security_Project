// server/routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getSessionMessages,
  getConversations,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.post('/send', protect, sendMessage);

// Changed from GET to POST to avoid URL encoding issues with session IDs
router.post('/session/get', protect, getSessionMessages);

router.get('/conversations', protect, getConversations);

module.exports = router;