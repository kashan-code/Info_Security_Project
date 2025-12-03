// server/controllers/keyExchangeController.js - CORRECTED VERSION
const KeyExchange = require('../models/KeyExchange');
const User = require('../models/User');

// @desc    Initiate key exchange (Round 1)
// @route   POST /api/key-exchange/initiate
// @access  Private
exports.initiateKeyExchange = async (req, res) => {
  try {
    const {
      to,
      sessionId,
      ecdhPublicKey,
      challenge,
      timestamp,
      signature,
    } = req.body;

    console.log('\n=== Key Exchange Initiation Request ===');
    console.log('From (req.user.id):', req.user.id);
    console.log('From (type):', typeof req.user.id);
    console.log('From (string):', req.user.id.toString());
    console.log('To:', to);
    console.log('To (type):', typeof to);
    
    // CRITICAL FIX: Convert both to strings for comparison
    const currentUserIdStr = req.user.id.toString();
    const targetUserIdStr = String(to);
    
    console.log('Current User (string):', currentUserIdStr);
    console.log('Target User (string):', targetUserIdStr);
    console.log('Are they equal?', currentUserIdStr === targetUserIdStr);

    // Validate ALL required fields
    const missingFields = [];
    if (!to) missingFields.push('to');
    if (!sessionId) missingFields.push('sessionId');
    if (!ecdhPublicKey) missingFields.push('ecdhPublicKey');
    if (!challenge) missingFields.push('challenge');
    if (!timestamp) missingFields.push('timestamp');
    if (!signature) missingFields.push('signature');

    if (missingFields.length > 0) {
      console.log('✗ Missing required fields:', missingFields);
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: ' + missingFields.join(', '),
        missingFields
      });
    }

    // Check if target user is same as initiator
    if (currentUserIdStr === targetUserIdStr) {
      console.log('✗ Cannot initiate key exchange with yourself');
      console.log('  Current:', currentUserIdStr);
      console.log('  Target:', targetUserIdStr);
      return res.status(400).json({
        success: false,
        message: 'Cannot initiate key exchange with yourself',
        errorCode: 'SELF_EXCHANGE'
      });
    }

    // Check if target user exists
    const targetUser = await User.findById(targetUserIdStr);
    if (!targetUser) {
      console.log('✗ Target user not found:', targetUserIdStr);
      return res.status(404).json({
        success: false,
        message: 'Target user not found',
        errorCode: 'USER_NOT_FOUND'
      });
    }

    console.log('✓ Target user found:', targetUser.username);

    // Check if target user has signing public key
    if (!targetUser.signingPublicKey) {
      console.log('✗ Target user has not generated keys yet');
      return res.status(400).json({
        success: false,
        message: 'Target user must generate encryption keys first',
        errorCode: 'NO_KEYS_GENERATED',
        details: {
          userId: targetUserIdStr,
          username: targetUser.username,
          hasSigningKey: !!targetUser.signingPublicKey,
          hasECCKey: !!targetUser.eccPublicKey,
          hasRSAKey: !!targetUser.publicKey
        }
      });
    }

    // Get initiator's info
    const initiator = await User.findById(currentUserIdStr);

    // Check if initiator has signing public key
    if (!initiator.signingPublicKey) {
      console.log('✗ Initiator has not generated keys yet');
      return res.status(400).json({
        success: false,
        message: 'You must generate encryption keys first',
        errorCode: 'NO_OWN_KEYS',
        details: {
          userId: currentUserIdStr,
          username: initiator.username,
          hasSigningKey: !!initiator.signingPublicKey,
          hasECCKey: !!initiator.eccPublicKey,
          hasRSAKey: !!initiator.publicKey
        }
      });
    }

    console.log('✓ Both users have keys generated');

    // Create key exchange record
    const keyExchange = await KeyExchange.create({
      sessionId,
      initiator: currentUserIdStr,
      responder: targetUserIdStr,
      status: 'pending',
      initiatorData: {
        ecdhPublicKey,
        challenge,
        timestamp,
        signature,
      },
    });

    console.log('✓ Key exchange created successfully');
    console.log(`  Initiator: ${initiator.username} (${currentUserIdStr})`);
    console.log(`  Responder: ${targetUser.username} (${targetUserIdStr})`);
    console.log(`  Session: ${sessionId}`);

    res.status(201).json({
      success: true,
      message: 'Key exchange initiated',
      sessionId,
      data: {
        sessionId: keyExchange.sessionId,
        status: keyExchange.status,
        initiator: {
          id: initiator._id,
          username: initiator.username
        },
        responder: {
          id: targetUser._id,
          username: targetUser.username
        }
      },
    });
  } catch (error) {
    console.error('✗ Initiate key exchange error:', error);
    
    // Handle duplicate session ID
    if (error.code === 11000 && error.keyPattern?.sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID already exists',
        errorCode: 'DUPLICATE_SESSION'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error initiating key exchange',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      errorCode: 'SERVER_ERROR'
    });
  }
};

// @desc    Get pending key exchange requests for user
// @route   GET /api/key-exchange/pending
// @access  Private
exports.getPendingExchanges = async (req, res) => {
  try {
    console.log(`\n=== Fetching Pending Exchanges ===`);
    console.log('For user:', req.user.id.toString());
    
    const exchanges = await KeyExchange.find({
      responder: req.user.id,
      status: 'pending',
    })
      .populate('initiator', 'username email signingPublicKey')
      .sort({ initiatedAt: -1 });

    console.log(`Found ${exchanges.length} pending exchange(s)`);
    
    // Format response with necessary data
    const formatted = exchanges.map((ex) => ({
      sessionId: ex.sessionId,
      from: ex.initiator._id.toString(),
      fromUsername: ex.initiator.username,
      initiatorSigningPublicKey: ex.initiator.signingPublicKey,
      type: 'KEY_EXCHANGE_INIT',
      to: ex.responder.toString(),
      ecdhPublicKey: ex.initiatorData.ecdhPublicKey,
      challenge: ex.initiatorData.challenge,
      timestamp: ex.initiatorData.timestamp,
      signature: ex.initiatorData.signature,
      initiatedAt: ex.initiatedAt,
    }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      exchanges: formatted,
    });
  } catch (error) {
    console.error('✗ Get pending exchanges error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending exchanges',
    });
  }
};

// @desc    Respond to key exchange (Round 2)
// @route   POST /api/key-exchange/respond
// @access  Private
exports.respondToKeyExchange = async (req, res) => {
  try {
    const {
      sessionId,
      ecdhPublicKey,
      challengeResponse,
      timestamp,
      signature,
    } = req.body;

    console.log('\n=== Key Exchange Response ===');
    console.log('Session:', sessionId);
    console.log('Responder:', req.user.id.toString());

    // Find key exchange
    const keyExchange = await KeyExchange.findOne({ sessionId });

    if (!keyExchange) {
      console.log('✗ Key exchange session not found');
      return res.status(404).json({
        success: false,
        message: 'Key exchange session not found',
      });
    }

    // Verify responder
    if (keyExchange.responder.toString() !== req.user.id.toString()) {
      console.log('✗ Not authorized to respond');
      console.log('  Expected responder:', keyExchange.responder.toString());
      console.log('  Actual responder:', req.user.id.toString());
      return res.status(403).json({
        success: false,
        message: 'Not authorized to respond to this exchange',
      });
    }

    // Update with response data
    keyExchange.responderData = {
      ecdhPublicKey,
      challengeResponse,
      timestamp,
      signature,
    };
    keyExchange.status = 'completed';
    keyExchange.completedAt = new Date();

    await keyExchange.save();

    console.log('✓ Key exchange completed');
    console.log(`  Session: ${sessionId}`);

    res.status(200).json({
      success: true,
      message: 'Key exchange completed',
      sessionId,
    });
  } catch (error) {
    console.error('✗ Respond to key exchange error:', error);
    res.status(500).json({
      success: false,
      message: 'Error responding to key exchange',
    });
  }
};

// @desc    Get key exchange status
// @route   GET /api/key-exchange/status/:sessionId
// @access  Private
exports.getExchangeStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;

    console.log(`\n=== Checking Exchange Status ===`);
    console.log('Session:', sessionId);
    console.log('Requested by:', req.user.id.toString());

    const keyExchange = await KeyExchange.findOne({ sessionId })
      .populate('responder', 'username signingPublicKey');

    if (!keyExchange) {
      console.log('✗ Session not found');
      return res.status(404).json({
        success: false,
        message: 'Key exchange session not found',
      });
    }

    // Check if user is part of this exchange
    const isInitiator = keyExchange.initiator.toString() === req.user.id.toString();
    const isResponder = keyExchange.responder._id.toString() === req.user.id.toString();

    if (!isInitiator && !isResponder) {
      console.log('✗ Not authorized to view this exchange');
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this exchange',
      });
    }

    console.log('Status:', keyExchange.status);

    // If completed, return responder data
    if (keyExchange.status === 'completed') {
      console.log('✓ Exchange completed - returning response data');
      
      return res.status(200).json({
        success: true,
        status: 'completed',
        data: {
          type: 'KEY_EXCHANGE_RESPOND',
          from: keyExchange.responder._id.toString(),
          to: keyExchange.initiator.toString(),
          sessionId: keyExchange.sessionId,
          responderSigningPublicKey: keyExchange.responder.signingPublicKey,
          ecdhPublicKey: keyExchange.responderData.ecdhPublicKey,
          challengeResponse: keyExchange.responderData.challengeResponse,
          timestamp: keyExchange.responderData.timestamp,
          signature: keyExchange.responderData.signature,
        },
      });
    }

    res.status(200).json({
      success: true,
      status: keyExchange.status,
    });
  } catch (error) {
    console.error('✗ Get exchange status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching exchange status',
    });
  }
};

// @desc    Get all key exchanges (for logging/audit)
// @route   GET /api/key-exchange/history
// @access  Private
exports.getExchangeHistory = async (req, res) => {
  try {
    const exchanges = await KeyExchange.find({
      $or: [
        { initiator: req.user.id },
        { responder: req.user.id }
      ],
    })
      .populate('initiator', 'username')
      .populate('responder', 'username')
      .sort({ initiatedAt: -1 })
      .limit(50);

    const formatted = exchanges.map((ex) => ({
      sessionId: ex.sessionId,
      initiator: ex.initiator.username,
      responder: ex.responder.username,
      status: ex.status,
      initiatedAt: ex.initiatedAt,
      completedAt: ex.completedAt,
    }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      exchanges: formatted,
    });
  } catch (error) {
    console.error('Get exchange history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching exchange history',
    });
  }
};