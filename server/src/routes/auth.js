const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');

// POST /api/v1/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { register_number, email, password, username, role } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required' });
  }

  // 1. Try to find as a Student / User
  const query = register_number
    ? { register_number: register_number.toUpperCase() }
    : { email: email?.toLowerCase() };

  let user = await User.findOne(query);
  let isStaff = false;

  // 2. Fallback to Staff collection via username if not found
  if (!user && (username || register_number)) {
    const Staff = require('../models/Staff');
    const u = username || register_number;
    const staffQuery = { username: new RegExp(`^${u}$`, 'i') };
    user = await Staff.findOne(staffQuery);
    isStaff = !!user;
  }

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // Update last login if applicable
  if (!isStaff) {
    user.last_login = new Date();
    await user.save({ validateBeforeSave: false });
  }

  // Normalize role for frontend
  const tokenPayload = { 
    _id: user._id, 
    role: isStaff ? user.sys_role : user.role 
  };
  const token = generateToken(tokenPayload);

  const userObj = user.toJSON({ virtuals: true });
  delete userObj.password;
  delete userObj.face_embeddings;
  if (isStaff) {
    userObj.role = user.sys_role; // map standard role for frontend routing
  }

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: userObj,
  });
}));

// POST /api/v1/auth/register
router.post('/register', asyncHandler(async (req, res) => {
  const { name, register_number, email, password, role, block_name, floor_no, room_no, bed_id, gender, phone, department, academic_year } = req.body;

  if (!name || !password) {
    return res.status(400).json({ success: false, message: 'Name and password are required' });
  }

  const existingUser = await User.findOne({
    $or: [
      register_number ? { register_number: register_number.toUpperCase() } : null,
      email ? { email: email.toLowerCase() } : null,
    ].filter(Boolean),
  });

  if (existingUser) {
    return res.status(409).json({ success: false, message: 'User already exists' });
  }

  const user = await User.create({
    name, register_number, email, password, role: role || 'student',
    block_name, floor_no, room_no, bed_id, gender, phone, department, academic_year,
  });

  const token = generateToken(user);
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    token,
    user: { _id: user._id, name: user.name, role: user.role },
  });
}));

// GET /api/v1/auth/me
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  let user = await User.findById(req.user._id).select('-password -face_embeddings');
  let isStaff = false;
  if (!user) {
    const Staff = require('../models/Staff');
    user = await Staff.findById(req.user._id).select('-password');
    isStaff = !!user;
  }
  
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const userObj = user.toJSON();
  if (isStaff) userObj.role = user.sys_role;

  res.json({ success: true, user: userObj });
}));

// POST /api/v1/auth/logout
router.post('/logout', authenticate, asyncHandler(async (_req, res) => {
  // JWT is stateless — client clears the token
  res.json({ success: true, message: 'Logged out successfully' });
}));

module.exports = router;
