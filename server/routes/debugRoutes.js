// server/routes/debugRoutes.js - NEW FILE
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const KeyExchange = require('../models/KeyExchange');

// @desc    Debug endpoint to check users and key exchanges
// @route   GET /api/debug/users
// @access  Private
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('username email _id publicKey eccPublicKey signingPublicKey');
    
    // Get all key exchanges
    const exchanges = await KeyExchange.find({})
      .populate('initiator', 'username')
      .populate('responder', 'username');
    
    res.status(200).json({
      success: true,
      users,
      exchanges,
      currentUser: req.user ? {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email
      } : null
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug error',
      error: error.message
    });
  }
});

// @desc    Check specific user
// @route   GET /api/debug/user/:userId
// @access  Private
router.get('/user/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('username email _id publicKey eccPublicKey signingPublicKey createdAt');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get key exchanges involving this user
    const exchanges = await KeyExchange.find({
      $or: [
        { initiator: user._id },
        { responder: user._id }
      ]
    }).populate('initiator responder', 'username');
    
    res.status(200).json({
      success: true,
      user,
      exchanges
    });
  } catch (error) {
    console.error('Debug user error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug error',
      error: error.message
    });
  }
});

module.exports = router;