// server/models/KeyExchange.js
const mongoose = require('mongoose');

const keyExchangeSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  initiator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  responder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  // Round 1 data (from initiator)
  initiatorData: {
    ecdhPublicKey: String,
    challenge: String,
    timestamp: Number,
    signature: String,
  },
  // Round 2 data (from responder)
  responderData: {
    ecdhPublicKey: String,
    challengeResponse: String,
    timestamp: Number,
    signature: String,
  },
  // Security logging
  initiatedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  // For cleanup (delete after 24 hours)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    index: true,
  },
}, {
  timestamps: true,
});

// Auto-delete expired exchanges
keyExchangeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('KeyExchange', keyExchangeSchema);