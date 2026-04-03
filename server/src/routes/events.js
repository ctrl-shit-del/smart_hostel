const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { isFloorAdmin } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

const events = []; // In-memory for demo; replace with MongoDB model if time allows

router.get('/', authenticate, asyncHandler(async (_req, res) => {
  res.json({ success: true, events });
}));

router.post('/', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const event = { id: Date.now().toString(), ...req.body, registrations: [], created_by: req.user._id };
  events.unshift(event);
  res.status(201).json({ success: true, event });
}));

router.post('/:id/register', authenticate, asyncHandler(async (req, res) => {
  const event = events.find((e) => e.id === req.params.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
  if (event.registrations.includes(req.user._id.toString())) {
    return res.status(409).json({ success: false, message: 'Already registered' });
  }
  event.registrations.push(req.user._id.toString());
  res.json({ success: true, message: 'Registered successfully!', event });
}));

router.get('/leaderboard', authenticate, asyncHandler(async (_req, res) => {
  const leaderboard = {};
  for (const event of events) {
    for (const s of event.registrations) leaderboard[event.block || 'A Block'] = (leaderboard[event.block || 'A Block'] || 0) + 1;
  }
  res.json({ success: true, leaderboard });
}));

module.exports = router;
