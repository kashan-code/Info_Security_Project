// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { updatePublicKeys, getUserPublicKeys } = require('../controllers/keyController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes (requires authentication)
router.get('/me', protect, getMe);
router.patch('/update-keys', protect, updatePublicKeys);

// Get user public keys
router.get('/keys/:userId', protect, getUserPublicKeys);

module.exports = router;