const express = require('express');
const router = express.Router();
const Guest = require('../models/Guest');
const { authenticate } = require('../middleware/auth');
const { isWarden, isGuard } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');
const { generateQRToken, verifyQRToken } = require('../utils/jwt');
const { GUEST_STATUS, SOCKET_EVENTS } = require('../../../shared/constants');
const { emitToUser, emitToRole } = require('../utils/socket');

// POST /api/v1/guests/request
router.post('/request', authenticate, asyncHandler(async (req, res) => {
  const { guest_name, guest_phone, relationship, purpose, visit_date, id_type } = req.body;
  const guest = await Guest.create({
    host_student: req.user._id,
    host_register_number: req.user.register_number,
    host_block: req.user.block_name,
    host_room: req.user.room_no,
    guest_name, guest_phone, relationship, purpose, visit_date, id_type,
  });
  emitToRole('warden', SOCKET_EVENTS.DASHBOARD_UPDATE, { type: 'new_guest_request', guest_id: guest._id });
  res.status(201).json({ success: true, message: 'Guest request submitted', guest });
}));

// GET /api/v1/guests
router.get('/', authenticate, isWarden, asyncHandler(async (req, res) => {
  const { status } = req.query;
  const query = { host_block: req.user.block_name };
  if (status) query.status = status;
  const guests = await Guest.find(query).sort({ requested_at: -1 }).populate('host_student', 'name register_number');
  res.json({ success: true, count: guests.length, guests });
}));

// PUT /api/v1/guests/:id/approve
router.put('/:id/approve', authenticate, isWarden, asyncHandler(async (req, res) => {
  const guest = await Guest.findById(req.params.id);
  if (!guest) return res.status(404).json({ success: false, message: 'Guest request not found' });
  const qr_token = generateQRToken({ guest_id: guest._id, host_student: guest.host_student, visit_date: guest.visit_date }, '24h');
  guest.status = GUEST_STATUS.APPROVED;
  guest.approved_by = req.user._id;
  guest.approved_at = new Date();
  guest.qr_token = qr_token;
  await guest.save();
  emitToUser(guest.host_student, 'guest:approved', { guest_id: guest._id, qr_token });
  res.json({ success: true, guest, qr_token });
}));

// PUT /api/v1/guests/:id/reject
router.put('/:id/reject', authenticate, isWarden, asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const guest = await Guest.findById(req.params.id);
  if (!guest) return res.status(404).json({ success: false, message: 'Guest not found' });
  guest.status = GUEST_STATUS.REJECTED;
  guest.rejection_reason = reason;
  await guest.save();
  emitToUser(guest.host_student, 'guest:rejected', { guest_id: guest._id, reason });
  res.json({ success: true, guest });
}));

// POST /api/v1/guests/scan/entry — guard scans guest QR
router.post('/scan/entry', authenticate, isGuard, asyncHandler(async (req, res) => {
  const { qr_token } = req.body;
  let decoded;
  try { decoded = verifyQRToken(qr_token); } catch { return res.status(400).json({ success: false, message: 'Invalid or expired QR', status: 'RED' }); }
  const guest = await Guest.findById(decoded.guest_id);
  if (!guest || guest.status !== GUEST_STATUS.APPROVED) {
    return res.status(400).json({ success: false, message: 'Guest pass not valid', status: 'RED' });
  }
  guest.status = GUEST_STATUS.CHECKED_IN;
  guest.entry_time = new Date();
  guest.entry_guard = req.user._id;
  await guest.save();
  res.json({ success: true, status: 'GREEN', guest, message: `Guest ${guest.guest_name} checked in` });
}));

// GET /api/v1/guests/active
router.get('/active', authenticate, isGuard, asyncHandler(async (req, res) => {
  const active = await Guest.find({ status: GUEST_STATUS.CHECKED_IN }).populate('host_student', 'name register_number room_no');
  res.json({ success: true, count: active.length, active });
}));

module.exports = router;
