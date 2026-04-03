const express = require('express');
const router = express.Router();
const HealthEvent = require('../models/HealthEvent');
const { authenticate } = require('../middleware/auth');
const { isFloorAdmin, isWarden } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');
const { HEALTH_SEVERITY, SOCKET_EVENTS } = require('../../../shared/constants');
const { emitToRole, emitToUser } = require('../utils/socket');

// POST /api/v1/health/sos — student triggers SOS
router.post('/sos', authenticate, asyncHandler(async (req, res) => {
  const { severity, description, symptoms } = req.body;
  if (!severity) return res.status(400).json({ success: false, message: 'Severity is required' });

  const event = await HealthEvent.create({
    student_id: req.user._id,
    student_name: req.user.name,
    register_number: req.user.register_number,
    block_name: req.user.block_name,
    floor_no: req.user.floor_no,
    room_no: req.user.room_no,
    phone: req.user.phone,
    parent_phone: req.user.parent_phone,
    severity,
    description,
    symptoms: symptoms || [],
    warden_notified_at: new Date(),
    ...(severity === HEALTH_SEVERITY.CRITICAL ? { health_center_notified_at: new Date() } : {}),
    ...(severity === HEALTH_SEVERITY.CRITICAL ? { ambulance_called_at: new Date() } : {}),
    alerts_sent_to: [
      { name: 'Warden', phone: 'via-app', relation: 'Hostel Authority', sent_at: new Date() },
      ...(severity !== HEALTH_SEVERITY.MINOR && req.user.parent_phone
        ? [{ name: req.user.parent_name || 'Parent', phone: req.user.parent_phone, relation: 'Parent', sent_at: new Date() }]
        : []),
    ],
  });

  // Alert all wardens and admins immediately
  const alertPayload = {
    event_id: event._id,
    student_name: event.student_name,
    register_number: event.register_number,
    room: `${event.block_name}, Floor ${event.floor_no}, Room ${event.room_no}`,
    severity: event.severity,
    description: event.description,
    reported_at: event.reported_at,
  };

  emitToRole('warden', SOCKET_EVENTS.HEALTH_SOS, alertPayload);
  emitToRole('hostel_admin', SOCKET_EVENTS.HEALTH_SOS, alertPayload);
  if (severity === HEALTH_SEVERITY.CRITICAL) {
    emitToRole('floor_admin', SOCKET_EVENTS.HEALTH_SOS, alertPayload);
  }

  res.status(201).json({
    success: true,
    message: `SOS alert sent! ${severity === HEALTH_SEVERITY.CRITICAL ? 'Ambulance and emergency contacts notified.' : 'Warden notified.'}`,
    event,
  });
}));

// GET /api/v1/health/events
router.get('/events', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const { resolved, block } = req.query;
  const query = {};
  if (req.user.role !== 'hostel_admin') query.block_name = req.user.block_name;
  if (block) query.block_name = block;
  if (resolved !== undefined) query.resolved = resolved === 'true';
  const events = await HealthEvent.find(query).sort({ reported_at: -1 }).limit(50);
  res.json({ success: true, count: events.length, events });
}));

// PUT /api/v1/health/events/:id/resolve
router.put('/events/:id/resolve', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const { resolution_note } = req.body;
  const event = await HealthEvent.findById(req.params.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
  event.resolved = true;
  event.resolved_at = new Date();
  event.resolution_note = resolution_note;
  event.resolved_by = req.user._id;
  event.response_time_seconds = (event.resolved_at - event.reported_at) / 1000;
  await event.save();
  emitToUser(event.student_id, SOCKET_EVENTS.HEALTH_RESOLVED, { event_id: event._id, message: 'Your emergency has been resolved' });
  res.json({ success: true, event });
}));

// GET /api/v1/health/analytics
router.get('/analytics', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const block = req.user.role === 'hostel_admin' ? req.query.block : req.user.block_name;
  const match = block ? { block_name: block } : {};
  const [total, bySeverity, avgResponseTime] = await Promise.all([
    HealthEvent.countDocuments(match),
    HealthEvent.aggregate([{ $match: match }, { $group: { _id: '$severity', count: { $sum: 1 } } }]),
    HealthEvent.aggregate([
      { $match: { ...match, resolved: true } },
      { $group: { _id: null, avg_seconds: { $avg: '$response_time_seconds' } } },
    ]),
  ]);
  res.json({ success: true, total, bySeverity, avgResponseSeconds: avgResponseTime[0]?.avg_seconds || 0 });
}));

module.exports = router;
