// server/controllers/keyController.js
const User = require('../models/User');

// @desc    Update user's public keys
// @route   PATCH /api/auth/update-keys
// @access  Private
exports.updatePublicKeys = async (req, res) => {
  try {
    const { rsaPublicKey, eccPublicKey, signingPublicKey } = req.body;

    // Validate
    if (!rsaPublicKey || !eccPublicKey || !signingPublicKey) {
      return res.status(400).json({
        success: false,
        message: 'All public keys are required',
      });
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        publicKey: rsaPublicKey, // Main public key (RSA)
        eccPublicKey,
        signingPublicKey,
      },
      { new: true }
    );

    console.log(`✓ Public keys updated for user: ${user.username}`);

    res.status(200).json({
      success: true,
      message: 'Public keys updated successfully',
      user: {
        id: user._id,
        username: user.username,
        publicKey: user.publicKey,
        eccPublicKey: user.eccPublicKey,
        signingPublicKey: user.signingPublicKey,
      },
    });
  } catch (error) {
    console.error('Update keys error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating public keys',
    });
  }
};

// @desc    Get user's public keys by ID
// @route   GET /api/keys/:userId
// @access  Private
exports.getUserPublicKeys = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(
      'username publicKey eccPublicKey signingPublicKey'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        publicKey: user.publicKey,
        eccPublicKey: user.eccPublicKey,
        signingPublicKey: user.signingPublicKey,
      },
    });
  } catch (error) {
    console.error('Get user keys error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching user keys',
    });
  }
};