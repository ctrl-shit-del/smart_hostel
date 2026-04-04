const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const { generateToken } = require('../utils/jwt');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');

const ROLE_CATEGORIES = {
  student: ['student'],
  warden: ['hostel_admin', 'warden', 'floor_admin', 'mess_incharge', 'faculty'],
  proctor: ['proctor', 'hostel_admin'],
  service: ['guard', 'security_incharge', 'housekeeping', 'technician', 'dhobi'],
};

router.post('/login', asyncHandler(async (req, res) => {
  const { register_number, email, password, username, loginCategory } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required' });
  }

  const identifier = register_number || email || username;

  if (!identifier) {
    return res.status(400).json({ success: false, message: 'Please provide your ID or email.' });
  }

  let user = null;
  let isStaff = false;

  if (loginCategory === 'student') {
    user = await Student.findOne({
      $or: [
        { register_number: identifier.toUpperCase() },
        { email: identifier.toLowerCase() }
      ]
    });
    if (user && user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'This account is not a student account. Please use the correct login card.' });
    }
  } else if (loginCategory === 'warden') {
    user = await Staff.findOne({
      $or: [
        { username: new RegExp(`^${identifier}$`, 'i') },
        { 'contactInfo.email': new RegExp(`^${identifier}$`, 'i') }
      ]
    });
    if (user) {
      isStaff = true;
    } else {
      user = await Student.findOne({
        $or: [
          { register_number: identifier.toUpperCase() },
          { email: identifier.toLowerCase() }
        ]
      });
      if (user && !ROLE_CATEGORIES.warden.includes(user.role)) {
        return res.status(403).json({ success: false, message: 'This account is not a warden/faculty account. Please use the correct login card.' });
      }
    }
  } else if (loginCategory === 'proctor') {
    const Staff = require('../models/Staff');
    user = await Staff.findOne({
      $or: [
        { username: new RegExp(`^${identifier}$`, 'i') },
        { 'contactInfo.email': new RegExp(`^${identifier}$`, 'i') }
      ]
    });
    if (user) {
      isStaff = true;
      if (!ROLE_CATEGORIES.proctor.includes(user.effectiveRole)) {
        return res.status(403).json({ success: false, message: 'This account is not a proctor account. Please use the correct login card.' });
      }
    } else {
      user = await Student.findOne({
        $or: [
          { register_number: identifier.toUpperCase() },
          { email: identifier.toLowerCase() }
        ]
      });
      if (user && !ROLE_CATEGORIES.proctor.includes(user.role)) {
        return res.status(403).json({ success: false, message: 'This account is not a proctor account. Please use the correct login card.' });
      }
    }
  } else if (loginCategory === 'service') {
    user = await Staff.findOne({
      $or: [
        { username: new RegExp(`^${identifier}$`, 'i') },
        { 'contactInfo.email': new RegExp(`^${identifier}$`, 'i') }
      ]
    });
    if (user) {
      isStaff = true;
      if (!ROLE_CATEGORIES.service.includes(user.effectiveRole)) {
        return res.status(403).json({ success: false, message: 'This account is not a service provider account. Please use the correct login card.' });
      }
    }
  } else {
    const studentQuery = {
      $or: [
        { register_number: identifier.toUpperCase() },
        { email: identifier.toLowerCase() }
      ]
    };
    user = await Student.findOne(studentQuery);
    if (!user) {
      user = await Staff.findOne({
        $or: [
          { username: new RegExp(`^${identifier}$`, 'i') },
          { 'contactInfo.email': new RegExp(`^${identifier}$`, 'i') }
        ]
      });
      isStaff = !!user;
    }
  }

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  if (!isStaff && user.is_active === false) {
    return res.status(403).json({
      success: false,
      message: user.credentials_disabled_reason || 'Your hostel credentials are disabled. Please visit the hostel office.',
    });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  if (!isStaff) {
    user.last_login = new Date();
    await user.save({ validateBeforeSave: false });
  }

  const resolvedRole = isStaff ? user.effectiveRole : (user.role || 'student');
  const tokenPayload = { _id: user._id, role: resolvedRole };
  const token = generateToken(tokenPayload);

  const userObj = user.toJSON({ virtuals: true });
  delete userObj.password;
  delete userObj.face_embeddings;
  userObj.role = resolvedRole;

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: userObj,
  });
}));

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

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  let user = await Student.findById(req.user._id).select('-password -face_embeddings');
  let isStaff = false;
  if (!user) {
    user = await Staff.findById(req.user._id).select('-password');
    isStaff = !!user;
  }

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const userObj = user.toJSON({ virtuals: true });
  if (isStaff) userObj.role = user.effectiveRole;

  res.json({ success: true, user: userObj });
}));

router.post('/logout', authenticate, asyncHandler(async (_req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
}));

module.exports = router;
