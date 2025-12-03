// server/models/Message.js
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ciphertext: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
    nonce: {
      type: String,
      required: true,
      unique: true, // Prevent duplicate nonces
    },
    timestamp: {
      type: Number,
      required: true,
    },
    // ✨ NEW: Sequence number for message ordering
    sequenceNumber: {
      type: Number,
      required: true,
      default: 0,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying
MessageSchema.index({ sessionId: 1, sequenceNumber: 1 });
MessageSchema.index({ sender: 1, receiver: 1 });

module.exports = mongoose.model('Message', MessageSchema);