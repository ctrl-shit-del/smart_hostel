const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const SCHEDULE = {
  'A Block': {
    chota_dhobi: [
      { floor_range: [1, 5], day: 'Monday', time: '8:00 AM - 10:00 AM' },
      { floor_range: [6, 10], day: 'Wednesday', time: '8:00 AM - 10:00 AM' },
      { floor_range: [11, 15], day: 'Friday', time: '8:00 AM - 10:00 AM' },
    ],
    profab: { day: 'Tuesday', pickup: '9:00 AM - 11:00 AM', delivery: '3 days' },
  },
};

router.get('/schedule/me', authenticate, asyncHandler(async (req, res) => {
  const block = req.user.block_name || 'A Block';
  const floor = req.user.floor_no || 1;
  const blockSchedule = SCHEDULE[block] || SCHEDULE['A Block'];
  const mySlot = blockSchedule.chota_dhobi?.find((s) => floor >= s.floor_range[0] && floor <= s.floor_range[1]);
  res.json({ success: true, block, floor, chota_dhobi: mySlot || null, profab: blockSchedule.profab });
}));

router.get('/schedule', authenticate, asyncHandler(async (req, res) => {
  const { block } = req.query;
  const blockName = block || req.user.block_name || 'A Block';
  const schedule = SCHEDULE[blockName] || SCHEDULE['A Block'];
  res.json({ success: true, block: blockName, schedule });
}));

module.exports = router;
