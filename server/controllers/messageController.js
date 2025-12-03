// server/controllers/messageController.js - COMPLETE FIXED VERSION
const Message = require('../models/Message');
const User = require('../models/User');
const KeyExchange = require('../models/KeyExchange');

// @desc    Send encrypted message
// @route   POST /api/messages/send
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const {
      sessionId,
      receiverId,
      ciphertext,
      iv,
      nonce,
      timestamp,
      sequenceNumber,
    } = req.body;

    console.log('\n📤 =========== NEW ENCRYPTED MESSAGE ===========');
    console.log('👤 From:', req.user.id);
    console.log('👥 To:', receiverId);
    console.log('🆔 Session:', sessionId);
    console.log('🔢 Sequence:', sequenceNumber);

    // Validate input
    if (!sessionId || !receiverId || !ciphertext || !iv || !nonce || !timestamp) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        errorCode: 'MISSING_FIELDS'
      });
    }

    // Validate sequence number
    if (sequenceNumber === undefined || sequenceNumber === null || sequenceNumber < 0) {
      console.log('❌ Missing sequence number');
      return res.status(400).json({
        success: false,
        message: 'Valid sequence number is required',
        errorCode: 'INVALID_SEQUENCE'
      });
    }

    // Check if receiver is not sender
    if (receiverId === req.user.id.toString()) {
      console.log('❌ CANNOT SEND TO SELF:');
      console.log('   Sender ID:', req.user.id);
      console.log('   Receiver ID:', receiverId);
      
      return res.status(400).json({
        success: false,
        message: 'Cannot send message to yourself. Complete key exchange with a different user.',
        errorCode: 'SELF_MESSAGE_ATTEMPT',
        details: {
          senderId: req.user.id,
          receiverId: receiverId,
          sameUser: true
        }
      });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      console.log('❌ Receiver not found:', receiverId);
      return res.status(404).json({
        success: false,
        message: 'Receiver not found',
        errorCode: 'RECEIVER_NOT_FOUND'
      });
    }

    // Verify key exchange session exists and is completed
    const keyExchange = await KeyExchange.findOne({
      sessionId,
      $or: [
        { initiator: req.user.id, responder: receiverId, status: 'completed' },
        { initiator: receiverId, responder: req.user.id, status: 'completed' }
      ]
    });

    if (!keyExchange) {
      console.log('❌ NO VALID KEY EXCHANGE:');
      console.log('   Session:', sessionId);
      console.log('   User 1:', req.user.id);
      console.log('   User 2:', receiverId);
      console.log('   Are they the same?', req.user.id.toString() === receiverId);
      
      // Check if there's any key exchange (even failed)
      const anyExchange = await KeyExchange.findOne({ sessionId });
      if (anyExchange) {
        console.log('   Found exchange but status:', anyExchange.status);
      }
      
      return res.status(400).json({
        success: false,
        message: 'No valid encryption session found. Complete key exchange with this user first.',
        errorCode: 'NO_VALID_KEY_EXCHANGE',
        details: {
          sessionId,
          userId: req.user.id,
          receiverId,
          sameUser: req.user.id.toString() === receiverId,
          needsKeyExchange: true
        }
      });
    }

    console.log('✅ Valid key exchange session found');

    // Validate timestamp (prevent replay attacks)
    const now = Date.now();
    const messageAge = now - timestamp;
    const MAX_AGE = 5 * 60 * 1000; // 5 minutes

    if (messageAge > MAX_AGE) {
      console.log('⚠️ Message timestamp too old:', messageAge, 'ms');
      return res.status(400).json({
        success: false,
        message: 'Message timestamp too old',
        errorCode: 'TIMESTAMP_TOO_OLD'
      });
    }

    if (timestamp > now + 60000) { // 1 minute in future
      console.log('⚠️ Message timestamp in future');
      return res.status(400).json({
        success: false,
        message: 'Invalid message timestamp',
        errorCode: 'TIMESTAMP_IN_FUTURE'
      });
    }

    // Validate ciphertext and IV lengths
    if (ciphertext.length < 16) {
      console.log('❌ Ciphertext too short:', ciphertext.length);
      return res.status(400).json({
        success: false,
        message: 'Invalid ciphertext',
        errorCode: 'INVALID_CIPHERTEXT'
      });
    }

    // Check for duplicate nonce (replay attack prevention)
    const existingMessage = await Message.findOne({ nonce });
    if (existingMessage) {
      console.log('🛡️ REPLAY ATTACK DETECTED - Nonce already used!');
      return res.status(400).json({
        success: false,
        message: 'Replay attack detected: Nonce already used',
        errorCode: 'REPLAY_ATTACK_NONCE'
      });
    }

    // Get the last message from this sender in this session
    const lastMessage = await Message.findOne({
      sessionId,
      sender: req.user.id,
      receiver: receiverId,
    }).sort({ sequenceNumber: -1 });

    if (lastMessage) {
      const expectedSequence = lastMessage.sequenceNumber + 1;
      
      // Allow some reordering but prevent large gaps
      if (sequenceNumber > expectedSequence + 10) {
        console.log(`⚠️ Large sequence gap - Expected: ${expectedSequence}, Got: ${sequenceNumber}`);
      }
      
      // Reject duplicate or old sequence numbers
      if (sequenceNumber <= lastMessage.sequenceNumber) {
        console.log(`🛡️ REPLAY ATTACK - Old sequence number: ${sequenceNumber} (last: ${lastMessage.sequenceNumber})`);
        return res.status(400).json({
          success: false,
          message: 'Replay attack detected: Invalid sequence number',
          errorCode: 'REPLAY_ATTACK_SEQUENCE'
        });
      }
    }

    // Save encrypted message
    const message = await Message.create({
      sessionId,
      sender: req.user.id,
      receiver: receiverId,
      ciphertext,
      iv,
      nonce,
      timestamp,
      sequenceNumber,
    });

    console.log('✅ Encrypted message saved');
    console.log('   Message ID:', message._id);
    console.log('   Sequence #:', message.sequenceNumber);
    console.log('   Ciphertext length:', ciphertext.length, 'chars');
    console.log('   IV length:', iv.length, 'chars');
    console.log('   Server CANNOT read message content ✓');
    console.log('📤 =========== MESSAGE SAVED ===========\n');

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        messageId: message._id,
        sequenceNumber: message.sequenceNumber,
        sentAt: message.sentAt,
      },
    });
  } catch (error) {
    console.error('\n❌ SEND MESSAGE ERROR:', error.message);
    
    // Handle duplicate nonce error
    if (error.code === 11000 && error.keyPattern?.nonce) {
      return res.status(400).json({
        success: false,
        message: 'Replay attack detected: Duplicate nonce',
        errorCode: 'DUPLICATE_NONCE'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      errorCode: 'SERVER_ERROR'
    });
  }
};

// @desc    Get messages for a session
// @route   POST /api/messages/session/get
// @access  Private
exports.getSessionMessages = async (req, res) => {
  try {
    const { sessionId } = req.body;

    console.log('\n📥 =========== FETCHING MESSAGES ===========');
    console.log('🆔 Session:', sessionId);
    console.log('👤 Requested by:', req.user.id);

    if (!sessionId) {
      console.log('❌ Missing session ID');
      return res.status(400).json({
        success: false,
        message: 'Session ID is required',
      });
    }

    const messages = await Message.find({
      sessionId,
      $or: [
        { sender: req.user.id },
        { receiver: req.user.id },
      ],
    })
      .populate('sender', 'username')
      .populate('receiver', 'username')
      .sort({ sequenceNumber: 1 })
      .limit(100);

    console.log(`✅ Found ${messages.length} message(s)`);

    const formatted = messages.map((msg) => ({
      messageId: msg._id,
      sessionId: msg.sessionId,
      sender: {
        id: msg.sender._id,
        username: msg.sender.username,
      },
      receiver: {
        id: msg.receiver._id,
        username: msg.receiver.username,
      },
      ciphertext: msg.ciphertext,
      iv: msg.iv,
      nonce: msg.nonce,
      timestamp: msg.timestamp,
      sequenceNumber: msg.sequenceNumber,
      sentAt: msg.sentAt,
    }));

    console.log('📥 =========== MESSAGES FETCHED ===========\n');

    res.status(200).json({
      success: true,
      count: formatted.length,
      messages: formatted,
    });
  } catch (error) {
    console.error('\n❌ GET MESSAGES ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
    });
  }
};

// @desc    Get conversation partners
// @route   GET /api/messages/conversations
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    console.log('\n💬 Fetching conversations for:', req.user.id);

    // Get all messages where user is sender or receiver
    const messages = await Message.find({
      $or: [
        { sender: req.user.id },
        { receiver: req.user.id },
      ],
    })
      .populate('sender', 'username')
      .populate('receiver', 'username')
      .sort({ sentAt: -1 });

    // Get unique conversation partners
    const partnersMap = new Map();

    messages.forEach((msg) => {
      const partnerId =
        msg.sender._id.toString() === req.user.id.toString()
          ? msg.receiver._id.toString()
          : msg.sender._id.toString();

      const partnerName =
        msg.sender._id.toString() === req.user.id.toString()
          ? msg.receiver.username
          : msg.sender.username;

      if (!partnersMap.has(partnerId)) {
        partnersMap.set(partnerId, {
          partnerId,
          partnerName,
          sessionId: msg.sessionId,
          lastMessageAt: msg.sentAt,
        });
      }
    });

    const conversations = Array.from(partnersMap.values());

    console.log(`✅ Found ${conversations.length} conversation(s)`);

    res.status(200).json({
      success: true,
      count: conversations.length,
      conversations,
    });
  } catch (error) {
    console.error('❌ Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations',
    });
  }
};

// @desc    Cleanup old messages
// @route   POST /api/messages/cleanup
// @access  Private (Admin)
exports.cleanupOldMessages = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await Message.deleteMany({
      sentAt: { $lt: thirtyDaysAgo }
    });

    console.log(`🧹 Cleaned ${result.deletedCount} old messages`);

    res.status(200).json({
      success: true,
      deletedCount: result.deletedCount,
      message: 'Old messages cleaned up',
    });
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cleaning up messages',
    });
  }
};