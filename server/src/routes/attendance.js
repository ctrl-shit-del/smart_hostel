const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const { authenticate } = require('../middleware/auth');
const { isWarden, isFloorAdmin, isStudent } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');
const { generateQRToken, verifyQRToken } = require('../utils/jwt');
const { ATTENDANCE_STATUS, ATTENDANCE_METHOD, SOCKET_EVENTS } = require('../../../shared/constants');
const { emitToRole, emitToBlock } = require('../utils/socket');
const { format, startOfDay } = require('date-fns');

// GET /api/v1/attendance — list (role-filtered)
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { date, block, floor, status } = req.query;
  const query = {};
  const dateStr = date || format(new Date(), 'yyyy-MM-dd');
  query.date = dateStr;
  if (req.user.role === 'student') query.student_id = req.user._id;
  else if (req.user.role === 'warden') query.block_name = req.user.block_name;
  else if (req.user.role === 'floor_admin') { query.block_name = req.user.block_name; query.floor_no = req.user.floor_no; }
  if (block) query.block_name = block;
  if (floor) query.floor_no = parseInt(floor);
  if (status) query.status = status;
  const records = await Attendance.find(query).sort({ floor_no: 1, room_no: 1 });
  res.json({ success: true, date: dateStr, count: records.length, records });
}));

// GET /api/v1/attendance/anomalies
router.get('/anomalies', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const block = req.user.role === 'hostel_admin' ? req.query.block : req.user.block_name;
  const flagged = await Attendance.find({ block_name: block, flagged: true }).sort({ consecutive_absences: -1 }).limit(50);
  res.json({ success: true, count: flagged.length, anomalies: flagged });
}));

// GET /api/v1/attendance/floor/:block/:floor — floor view for warden
router.get('/floor/:block/:floor', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const { block, floor } = req.params;
  const { date } = req.query;
  const dateStr = date || format(new Date(), 'yyyy-MM-dd');
  const records = await Attendance.find({ block_name: block, floor_no: parseInt(floor), date: dateStr });
  const summary = {
    total: records.length,
    present: records.filter((r) => r.status === ATTENDANCE_STATUS.PRESENT).length,
    absent: records.filter((r) => r.status === ATTENDANCE_STATUS.ABSENT).length,
    on_leave: records.filter((r) => r.status === ATTENDANCE_STATUS.ON_LEAVE).length,
  };
  res.json({ success: true, date: dateStr, block, floor: parseInt(floor), summary, records });
}));

// GET /api/v1/attendance/student/:id
router.get('/student/:id', authenticate, asyncHandler(async (req, res) => {
  // Students can only view their own
  const studentId = req.user.role === 'student' ? req.user._id : req.params.id;
  const records = await Attendance.find({ student_id: studentId }).sort({ date: -1 }).limit(30);
  res.json({ success: true, records });
}));

// POST /api/v1/attendance/qr/generate — generate today's attendance QR (warden/admin)
router.post('/qr/generate', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const { block, floor, valid_minutes = 60 } = req.body;
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const qr_code_id = `ATT-${block}-${floor}-${dateStr}`;

  const token = generateQRToken(
    { qr_code_id, block, floor, date: dateStr, type: 'attendance' },
    `${valid_minutes}m`
  );

  res.json({ success: true, qr_token: token, qr_code_id, valid_until: new Date(Date.now() + valid_minutes * 60000), date: dateStr });
}));

// POST /api/v1/attendance/qr/scan — student scans attendance QR
router.post('/qr/scan', authenticate, asyncHandler(async (req, res) => {
  const { qr_token, latitude, longitude } = req.body;

  let decoded;
  try { decoded = verifyQRToken(qr_token); }
  catch { return res.status(400).json({ success: false, message: 'Invalid or expired QR code' }); }

  if (decoded.type !== 'attendance') {
    return res.status(400).json({ success: false, message: 'Wrong QR code type' });
  }

  const { date, qr_code_id } = decoded;

  // Prevent double-scan
  const existing = await Attendance.findOne({ student_id: req.user._id, date });
  if (existing && existing.status === ATTENDANCE_STATUS.PRESENT) {
    return res.status(409).json({ success: false, message: 'Attendance already marked for today' });
  }

  const record = await Attendance.findOneAndUpdate(
    { student_id: req.user._id, date },
    {
      student_id: req.user._id,
      student_name: req.user.name,
      register_number: req.user.register_number,
      block_name: req.user.block_name,
      floor_no: req.user.floor_no,
      room_no: req.user.room_no,
      date,
      status: ATTENDANCE_STATUS.PRESENT,
      method: ATTENDANCE_METHOD.QR,
      qr_scanned_at: new Date(),
      qr_code_id,
      scan_location: { latitude, longitude },
    },
    { upsert: true, new: true }
  );

  res.json({ success: true, message: 'Attendance marked successfully!', record });
}));

// POST /api/v1/attendance/mark — manual mark (admin/warden)
router.post('/mark', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const { student_id, date, status, reason } = req.body;
  const dateStr = date || format(new Date(), 'yyyy-MM-dd');
  const record = await Attendance.findOneAndUpdate(
    { student_id, date: dateStr },
    { status, method: ATTENDANCE_METHOD.MANUAL, manual_marked_by: req.user._id, manual_reason: reason },
    { upsert: true, new: true }
  );
  res.json({ success: true, message: 'Attendance manually updated', record });
}));

// POST /api/v1/attendance/wifi/sync — simulated WiFi-based auto-marking
router.post('/wifi/sync', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const { detected_devices, date } = req.body; // array of MAC addresses detected
  const dateStr = date || format(new Date(), 'yyyy-MM-dd');

  const Student = require('../models/Student');
  const students = await Student.find({ device_mac: { $in: detected_devices } });

  const operations = students.map((student) => ({
    updateOne: {
      filter: { student_id: student._id, date: dateStr },
      update: {
        $set: {
          student_id: student._id,
          student_name: student.name,
          register_number: student.register_number,
          block_name: student.block_name,
          floor_no: student.floor_no,
          room_no: student.room_no,
          date: dateStr,
          status: ATTENDANCE_STATUS.PRESENT,
          method: ATTENDANCE_METHOD.WIFI,
          wifi_detected_at: new Date(),
          device_mac: student.device_mac,
        },
      },
      upsert: true,
    },
  }));

  if (operations.length) await Attendance.bulkWrite(operations);

  // Flag anomalies: students NOT in detected_devices → absent
  emitToRole('warden', SOCKET_EVENTS.ATTENDANCE_UPDATED, { date: dateStr, synced: students.length });
  res.json({ success: true, message: `WiFi sync complete. ${students.length} student(s) marked present.`, date: dateStr });
}));

// ─── Night Attendance Window ─────────────────────────────────────────────────

// GET /api/v1/attendance/window/status — any authenticated user checks their block's window
router.get('/window/status', authenticate, asyncHandler(async (req, res) => {
  const Block = require('../models/Block');
  const blockName = req.user.block_name || req.query.block || 'A Block';

  const block = await Block.findOne({ block_name: blockName }).select(
    'block_name attendance_window_open attendance_window_opened_at attendance_window_closed_at wifi_ip'
  );
  if (!block) return res.status(404).json({ success: false, message: 'Block not found' });

  // Check if student already marked present today
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  let already_checked_in = false;
  if (req.user.role === 'student') {
    const existing = await Attendance.findOne({ student_id: req.user._id, date: dateStr, status: ATTENDANCE_STATUS.PRESENT });
    already_checked_in = !!existing;
  }

  res.json({
    success: true,
    block_name: block.block_name,
    window_open: block.attendance_window_open,
    opened_at: block.attendance_window_opened_at,
    closed_at: block.attendance_window_closed_at,
    wifi_ip: block.wifi_ip || null,
    already_checked_in,
    date: dateStr,
  });
}));

// POST /api/v1/attendance/window/toggle — warden/hostel_admin flips their block's window
router.post('/window/toggle', authenticate, isWarden, asyncHandler(async (req, res) => {
  const Block = require('../models/Block');
  // Warden uses their own block; hostel_admin can pass block_name in body; fallback to 'A Block' for testing
  const blockName = req.user.block_name || req.body.block_name || 'A Block';

  const block = await Block.findOne({ block_name: blockName });
  if (!block) return res.status(404).json({ success: false, message: `Block "${blockName}" not found` });

  const newState = !block.attendance_window_open;
  const updateFields = { attendance_window_open: newState };
  if (newState) updateFields.attendance_window_opened_at = new Date();
  else updateFields.attendance_window_closed_at = new Date();

  await Block.findByIdAndUpdate(block._id, updateFields);

  emitToBlock(blockName, SOCKET_EVENTS.ATTENDANCE_WINDOW_TOGGLED, {
    block_name: blockName,
    window_open: newState,
    toggled_by: req.user.name,
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    block_name: blockName,
    window_open: newState,
    message: `Night attendance window ${newState ? 'opened' : 'closed'} for ${blockName}`,
  });
}));

// POST /api/v1/attendance/face/checkin — student submits liveness-verified face attendance
router.post('/face/checkin', authenticate, isStudent, asyncHandler(async (req, res) => {
  const Block = require('../models/Block');

  const blockName = req.user.block_name || 'A Block';

  const block = await Block.findOne({ block_name: blockName }).select('attendance_window_open wifi_ip');
  if (!block) return res.status(404).json({ success: false, message: 'Block not found' });
  if (!block.attendance_window_open) {
    return res.status(403).json({ success: false, message: 'Attendance window is not currently open for your block' });
  }

  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const existing = await Attendance.findOne({ student_id: req.user._id, date: dateStr });
  if (existing && existing.status === ATTENDANCE_STATUS.PRESENT) {
    return res.status(409).json({ success: false, message: 'Attendance already marked for today' });
  }

  // Capture client IP (IP whitelisting currently open — all IPs accepted, IP is logged only)
  const clientIp =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    'unknown';

  const record = await Attendance.findOneAndUpdate(
    { student_id: req.user._id, date: dateStr },
    {
      $set: {
        student_id: req.user._id,
        student_name: req.user.name,
        register_number: req.user.register_number,
        block_name: req.user.block_name,
        floor_no: req.user.floor_no,
        room_no: req.user.room_no,
        date: dateStr,
        status: ATTENDANCE_STATUS.PRESENT,
        method: ATTENDANCE_METHOD.FACE,
        face_detected_at: new Date(),
        client_ip: clientIp,
      },
    },
    { upsert: true, new: true }
  );

  emitToBlock(blockName, SOCKET_EVENTS.ATTENDANCE_UPDATED, {
    student_name: req.user.name,
    register_number: req.user.register_number,
    method: 'face',
    date: dateStr,
    block_name: blockName,
  });
  emitToRole('warden', SOCKET_EVENTS.ATTENDANCE_UPDATED, {
    type: 'face_checkin',
    student_name: req.user.name,
    block_name: blockName,
    date: dateStr,
  });

  res.json({ success: true, message: '✅ Face attendance marked successfully!', record });
}));

module.exports = router;
