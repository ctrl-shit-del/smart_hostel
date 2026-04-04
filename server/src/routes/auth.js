const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const { generateToken } = require('../utils/jwt');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');

// POST /api/v1/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { register_number, username, email, password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required' });
  }

  let user = null;
  let isStaff = false;

  if (register_number) {
    user = await Student.findOne({ register_number: register_number.toUpperCase() });
  } else if (username) {
    user = await Staff.findOne({ username });
    isStaff = !!user;
  } else if (email) {
    // Try both, usually staff uses email or username
    user = await Staff.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { 'contactInfo.email': email.toLowerCase() }
      ] 
    });
    if (user) {
      isStaff = true;
    } else {
      user = await Student.findOne({ email: email.toLowerCase() });
    }
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
    role: isStaff ? (user.sys_role || user.role) : user.role 
  };
  const token = generateToken(tokenPayload);

  const userObj = user.toJSON({ virtuals: true });
  delete userObj.password;
  delete userObj.face_embeddings;
  if (isStaff) {
    userObj.role = user.sys_role || user.role; // map standard role for frontend routing
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
  const { name, register_number, email, username, password, role, block_name, floor_no, room_no, bed_id, gender, phone, department, academic_year } = req.body;

  if (!name || !password) {
    return res.status(400).json({ success: false, message: 'Name and password are required' });
  }

  const isStudent = !role || role === 'student';
  let existingUser;

  if (isStudent) {
    existingUser = await Student.findOne({
      $or: [
        { register_number: register_number?.toUpperCase() },
        { email: email?.toLowerCase() },
      ].filter(v => v.register_number || v.email),
    });
  } else {
    existingUser = await Staff.findOne({
      $or: [
        { username: username },
        { email: email?.toLowerCase() },
      ].filter(v => v.username || v.email),
    });
  }

  if (existingUser) {
    return res.status(409).json({ success: false, message: 'User already exists' });
  }

  let user;
  if (isStudent) {
    user = await Student.create({
      name, register_number, email, password, role: 'student',
      block_name, floor_no, room_no, bed_id, gender, phone, department, academic_year,
    });
  } else {
    user = await Staff.create({
      name, username: username || email, email, password, role,
      gender, phone,
    });
  }

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
  // req.user is already fetched in authenticate middleware
  res.json({ success: true, user: req.user });
}));

// POST /api/v1/auth/logout
router.post('/logout', authenticate, asyncHandler(async (_req, res) => {
  // JWT is stateless — client clears the token
  res.json({ success: true, message: 'Logged out successfully' });
}));

module.exports = router;
