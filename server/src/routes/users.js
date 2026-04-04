const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const { authenticate } = require('../middleware/auth');
const { isAdmin, isWarden } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/v1/users — admin/warden only, lists students
router.get('/', authenticate, isWarden, asyncHandler(async (req, res) => {
  const { role, block, floor, page = 1, limit = 50 } = req.query;
  const query = { role: role || 'student' };
  
  if (req.user.role === 'warden') query.block_name = req.user.block_name;
  if (block) query.block_name = block;
  if (floor) {
    const floorInt = parseInt(floor);
    query.$or = [{ floor_no: floorInt }, { floor: `Floor ${floorInt}` }];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // This route is primarily for students
  const [users, total] = await Promise.all([
    Student.find(query).select('-password -face_embeddings').sort({ name: 1 }).skip(skip).limit(parseInt(limit)),
    Student.countDocuments(query),
  ]);
  res.json({ success: true, total, page: parseInt(page), users });
}));

// GET /api/v1/users/me/profile
router.get('/me/profile', authenticate, asyncHandler(async (req, res) => {
  // req.user is already fetched in authenticate middleware
  res.json({ success: true, user: req.user });
}));

// PUT /api/v1/users/me/profile
router.put('/me/profile', authenticate, asyncHandler(async (req, res) => {
  const allowedFields = ['phone', 'parent_name', 'parent_phone', 'parent_email', 'profile_photo', 'device_mac'];
  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  let user;
  if (req.user.role === 'student') {
    user = await Student.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-password -face_embeddings');
  } else {
    // For staff, phone might be inside contactInfo or top level depending on schema sync
    user = await Staff.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-password');
  }
  
  res.json({ success: true, message: 'Profile updated', user });
}));

// GET /api/v1/users/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  // Try student first, then staff
  let user = await Student.findById(req.params.id).select('-password -face_embeddings');
  if (!user) {
    user = await Staff.findById(req.params.id).select('-password');
  }
  
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user });
}));

module.exports = router;
