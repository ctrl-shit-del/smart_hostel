const express = require('express');
const router = express.Router();
const LaundrySession = require('../models/LaundrySession');
const Room = require('../models/Room');
const User = require('../models/Student');
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
  
  const blockLetter = (req.user.block_name || req.user.block || '').split(' ')[0];
  const qrToken = `${req.user.register_number}_${req.user.room_no}_${blockLetter}`;

  res.json({
    success: true,
    laundry_day: room.laundry_day,
    is_laundry_day: isLaundryDay,
    current_day: todayName,
    active_session: activeSession,
    qr_token: qrToken
  });
}));



// Helper to parse & validate QR and fetch student
async function resolveQR(qr_token, res) {
  const parts = qr_token.split('_');
  if (parts.length < 3) {
    res.status(400).json({ success: false, message: 'Invalid QR format. Expected REGNO_ROOMNO_BLOCK.' });
    return null;
  }
  const register_number = parts[0].toUpperCase();
  const room_no = parseInt(parts[1], 10);

  const student = await User.findOne({ register_number });
  if (!student) {
    res.status(404).json({ success: false, message: 'Student not found.' });
    return null;
  }
  return { register_number, room_no, student };
}

const DHOBI_ROLES = ['housekeeping', 'admin', 'hostel_admin'];

// POST /api/v1/laundry/scan/receive  — Dhobi accepts a bag from student
router.post('/scan/receive', authenticate, asyncHandler(async (req, res) => {
  if (!DHOBI_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Unauthorized role' });
  }

  const { qr_token } = req.body;
  if (!qr_token) return res.status(400).json({ success: false, message: 'No QR token provided' });

  const parsed = await resolveQR(qr_token, res);
  if (!parsed) return;
  const { register_number, room_no, student } = parsed;

  // Schedule check
  const room = await Room.findOne({ block_name: student.block_name || student.block, room_number: student.room_no });
  if (!room) return res.status(400).json({ success: false, message: 'Room configuration missing.' });

  const todayName = DAYS[new Date().getDay()];
  if (room.laundry_day !== todayName) {
    student.dhobi_offence = (student.dhobi_offence || 0) + 1;
    await student.save({ validateBeforeSave: false });
    emitToUser(student._id, SOCKET_EVENTS.LAUNDRY_OUT_OF_SCHEDULE, {
      message: `Invalid Drop-off! Your laundry day is ${room.laundry_day}. Please pick up your bag immediately.`
    });
    return res.status(400).json({ success: false, message: `Schedule Violation — today is not ${room.laundry_day}. Bag rejected.` });
  }

  // Prevent duplicate receive
  const existing = await LaundrySession.findOne({
    register_number,
    status: { $in: [LAUNDRY_STATUS.PROCESSING, LAUNDRY_STATUS.READY] }
  });
  if (existing) {
    return res.status(400).json({ success: false, message: `Already has an active session (${existing.status}). Cannot receive again.` });
  }

  // Create PROCESSING session
  const session_id = 'LNDRY-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  await LaundrySession.create({
    session_id,
    student_id: student._id,
    register_number,
    room_no: student.room_no,
    block_name: student.block_name || student.block,
    floor_no: student.floor_no || student.floor,
    status: LAUNDRY_STATUS.PROCESSING
  });

  emitToUser(student._id, SOCKET_EVENTS.LAUNDRY_ACCEPTED, { message: '✅ Laundry Bag Received by Dhobi! We\'ll notify you when it\'s ready.' });
  return res.json({ success: true, status: 'Processing', message: `Bag received from ${student.name || register_number}. Session started.` });
}));

// POST /api/v1/laundry/scan/send  — Dhobi sends cleaned clothes back
router.post('/scan/send', authenticate, asyncHandler(async (req, res) => {
  if (!DHOBI_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Unauthorized role' });
  }

  const { qr_token } = req.body;
  if (!qr_token) return res.status(400).json({ success: false, message: 'No QR token provided' });

  const parsed = await resolveQR(qr_token, res);
  if (!parsed) return;
  const { register_number, room_no, student } = parsed;

  // Must have a PROCESSING session to send back
  const session = await LaundrySession.findOne({ register_number, status: LAUNDRY_STATUS.PROCESSING });
  if (!session) {
    const alreadyReady = await LaundrySession.findOne({ register_number, status: LAUNDRY_STATUS.READY });
    if (alreadyReady) {
      return res.status(400).json({ success: false, message: 'Clothes are already marked Ready for pickup.' });
    }
    return res.status(400).json({ success: false, message: 'No received bag found for this student. Cannot send without first receiving.' });
  }

  session.status = LAUNDRY_STATUS.READY;
  session.exit_timestamp = new Date();
  await session.save();

  emitToUser(student._id, SOCKET_EVENTS.LAUNDRY_READY, { message: '🎉 Your clothes are cleaned and ready for pickup!' });
  return res.json({ success: true, status: 'Ready', message: `Clothes marked ready for ${student.name || register_number}.` });
}));

module.exports = router;
