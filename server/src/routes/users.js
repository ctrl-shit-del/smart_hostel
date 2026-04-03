const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { isAdmin, isWarden } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/v1/users — admin only
router.get('/', authenticate, isWarden, asyncHandler(async (req, res) => {
  const { role, block, floor, page = 1, limit = 50 } = req.query;
  const query = { role: role || 'student' };
  if (req.user.role === 'warden') query.block_name = req.user.block_name;
  if (block) query.block_name = block;
  if (floor) query.floor_no = parseInt(floor);
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    User.find(query).select('-password -face_embeddings').sort({ name: 1 }).skip(skip).limit(parseInt(limit)),
    User.countDocuments(query),
  ]);
  res.json({ success: true, total, page: parseInt(page), users });
}));

// GET /api/v1/users/me/profile
router.get('/me/profile', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password -face_embeddings');
  res.json({ success: true, user });
}));

// PUT /api/v1/users/me/profile
router.put('/me/profile', authenticate, asyncHandler(async (req, res) => {
  const allowedFields = ['phone', 'parent_name', 'parent_phone', 'parent_email', 'profile_photo', 'device_mac'];
  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-password -face_embeddings');
  res.json({ success: true, message: 'Profile updated', user });
}));

// GET /api/v1/users/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password -face_embeddings');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user });
}));

module.exports = router;
