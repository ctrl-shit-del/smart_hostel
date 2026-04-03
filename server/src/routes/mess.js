const express = require('express');
const router = express.Router();
const { MessMenu, NightOrder } = require('../models/Mess');
const { authenticate } = require('../middleware/auth');
const { isMessIncharge, isFloorAdmin } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');
const { format } = require('date-fns');

// GET /api/v1/mess/menu — today's menu
router.get('/menu', authenticate, asyncHandler(async (req, res) => {
  const { block, day } = req.query;
  const today = day || format(new Date(), 'EEEE');
  const query = { day: today };
  if (block) query.block_name = block;
  else if (req.user.block_name) query.block_name = req.user.block_name;
  const menu = await MessMenu.find(query);
  res.json({ success: true, day: today, menu });
}));

// GET /api/v1/mess/menu/week — weekly menu
router.get('/menu/week', authenticate, asyncHandler(async (req, res) => {
  const { block } = req.query;
  const blockName = block || req.user.block_name;
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const menu = await MessMenu.find({ block_name: blockName, day: { $in: days } }).sort({ day: 1, meal: 1 });

  // Group by day
  const weekly = {};
  for (const day of days) weekly[day] = menu.filter((m) => m.day === day);
  res.json({ success: true, block: blockName, weekly });
}));

// PUT /api/v1/mess/menu — admin updates menu
router.put('/menu', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const { block_name, day, meal, type, caterer, items } = req.body;
  const menu = await MessMenu.findOneAndUpdate(
    { block_name, day, meal },
    { block_name, day, meal, type, caterer, items, updated_by: req.user._id },
    { upsert: true, new: true }
  );
  res.json({ success: true, menu });
}));

// POST /api/v1/mess/night-order — student places night mess order
router.post('/night-order', authenticate, asyncHandler(async (req, res) => {
  const { items } = req.body;
  const total_amount = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const order = await NightOrder.create({
    student_id: req.user._id,
    block_name: req.user.block_name,
    room_no: req.user.room_no,
    items,
    total_amount,
  });
  res.status(201).json({ success: true, message: 'Night mess order placed!', order });
}));

// GET /api/v1/mess/crowd — crowd prediction for mess
router.get('/crowd', authenticate, asyncHandler(async (req, res) => {
  const now = new Date();
  const hour = now.getHours();
  // Heuristic prediction based on time-of-day
  const schedule = [
    { start: 7, end: 9, meal: 'Breakfast', prediction: 'High', confidence: 0.85 },
    { start: 12, end: 14, meal: 'Lunch', prediction: 'Very High', confidence: 0.92 },
    { start: 19, end: 21, meal: 'Dinner', prediction: 'High', confidence: 0.88 },
  ];
  const current = schedule.find((s) => hour >= s.start && hour < s.end) || { prediction: 'Low', confidence: 0.95, meal: 'Off-peak' };
  res.json({ success: true, current_hour: hour, crowd: current });
}));

module.exports = router;
