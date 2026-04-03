const express = require('express');
const router = express.Router();
const LaundrySession = require('../models/LaundrySession');
const Room = require('../models/Room');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { generateQRToken, verifyQRToken } = require('../utils/jwt');
const { LAUNDRY_STATUS, SOCKET_EVENTS } = require('../../../shared/constants');
const { emitToUser } = require('../utils/socket');
const crypto = require('crypto');

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// GET /api/v1/laundry/status
router.get('/status', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Only students have laundry days' });
  
  const room = await Room.findOne({ block_name: req.user.block_name || req.user.block, room_number: req.user.room_no });
  if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
  
  const todayName = DAYS[new Date().getDay()];
  const isLaundryDay = room.laundry_day === todayName;
  
  // Find active session
  const activeSession = await LaundrySession.findOne({ 
    student_id: req.user._id, 
    status: { $in: [LAUNDRY_STATUS.PROCESSING, LAUNDRY_STATUS.READY] } 
  });
  
  let qrToken = null;
  if (activeSession) {
    qrToken = generateQRToken({ session_id: activeSession.session_id, type: 'laundry' });
  }

  res.json({
    success: true,
    laundry_day: room.laundry_day,
    is_laundry_day: isLaundryDay,
    current_day: todayName,
    active_session: activeSession,
    qr_token: qrToken
  });
}));

// POST /api/v1/laundry/dropoff
router.post('/dropoff', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ success: false, message: 'Unauthorized' });

  const room = await Room.findOne({ block_name: req.user.block_name || req.user.block, room_number: req.user.room_no });
  const todayName = DAYS[new Date().getDay()];
  if (room.laundry_day !== todayName) {
    return res.status(400).json({ success: false, message: `Cannot drop off today. Your laundry day is ${room.laundry_day}.` });
  }

  // Check if they already have an active session
  const existing = await LaundrySession.findOne({ 
    student_id: req.user._id, 
    status: { $in: [LAUNDRY_STATUS.PROCESSING, LAUNDRY_STATUS.READY] } 
  });
  if (existing) return res.status(400).json({ success: false, message: 'You already have an active laundry session.' });

  const session_id = 'LNDRY-' + crypto.randomBytes(4).toString('hex').toUpperCase();

  const session = await LaundrySession.create({
    session_id,
    student_id: req.user._id,
    room_no: req.user.room_no,
    block_name: req.user.block_name || req.user.block,
    floor_no: req.user.floor_no || req.user.floor,
    status: LAUNDRY_STATUS.PROCESSING
  });

  const qrToken = generateQRToken({ session_id, type: 'laundry' });

  // Emulate 'Laundry Bag Accepted' alert (could be triggered by a physical scan, but since drop-off generates the session, we alert immediately)
  emitToUser(req.user._id, SOCKET_EVENTS.LAUNDRY_ACCEPTED, { message: 'Laundry Bag Accepted by Dhobi', session_id });

  res.status(201).json({ success: true, session, qr_token: qrToken });
}));

// POST /api/v1/laundry/scan/ready (Dhobi app scans QR to mark as Ready)
router.post('/scan/ready', authenticate, asyncHandler(async (req, res) => {
  // Only housekeeping/dhobi or admin should mark it ready
  if (!['housekeeping', 'admin', 'hostel_admin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Unauthorized role' });
  }

  const { qr_token } = req.body;
  if (!qr_token) return res.status(400).json({ success: false, message: 'No QR token provided' });

  let decoded;
  try {
    decoded = verifyQRToken(qr_token);
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Invalid or expired QR token' });
  }

  if (decoded.type !== 'laundry') return res.status(400).json({ success: false, message: 'Invalid token type' });

  const session = await LaundrySession.findOne({ session_id: decoded.session_id });
  if (!session) return res.status(404).json({ success: false, message: 'Laundry session not found' });
  
  if (session.status === LAUNDRY_STATUS.READY) {
    return res.status(400).json({ success: false, message: 'Laundry is already marked ready' });
  }

  session.status = LAUNDRY_STATUS.READY;
  session.exit_timestamp = new Date();
  await session.save();

  // Notification 2: Laundry Ready for Pickup
  emitToUser(session.student_id, SOCKET_EVENTS.LAUNDRY_READY, { 
    message: 'Your laundry is ready for pickup!', 
    session_id: session.session_id 
  });

  res.json({ success: true, message: 'Laundry marked as ready', session });
}));

module.exports = router;
