const express = require('express');
const router = express.Router();
const Staff = require('../models/Staff');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const staff = await Staff.find({ role: { $ne: 'student' } }).select('-password -face_embeddings').sort({ role: 1, name: 1 });
  res.json({ success: true, count: staff.length, staff });
}));

router.get('/directory', authenticate, asyncHandler(async (req, res) => {
  const { block } = req.query;
  const query = { role: { $ne: 'student' } };
  
  if (block) {
    query.$or = [
      { assignedHostels: block }, 
      { assigned_hostels: block }, 
      { isCampusWide: true }, 
      { is_campus_wide: true }
    ];
  }
  
  const staff = await Staff.find(query).select('name staff_role role shift_start shiftTimings phone contactInfo block_name isCampusWide is_campus_wide').sort({ staff_role: 1 });
  res.json({ success: true, staff });
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const staff = await Staff.findById(req.params.id).select('-password -face_embeddings');
  if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
  res.json({ success: true, staff });
}));

module.exports = router;
