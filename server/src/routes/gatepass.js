const express = require('express');
const router = express.Router();
const Gatepass = require('../models/Gatepass');
const { authenticate } = require('../middleware/auth');
const { isWarden, isGuard } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');
const { generateQRToken, verifyQRToken } = require('../utils/jwt');
const { GATEPASS_STATUS, GATEPASS_TYPES, SOCKET_EVENTS } = require('../../../shared/constants');
const { emitToUser, emitToBlock, emitToRole } = require('../utils/socket');
const cron = require('node-cron');

// Cron: check overdue gatepasses every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  try {
    const overdue = await Gatepass.find({
      status: GATEPASS_STATUS.ACTIVE,
      expected_return: { $lt: new Date() },
      overdue_alert_sent: false,
    });
    for (const gp of overdue) {
      gp.is_overdue = true;
      gp.overdue_alert_sent = true;
      await gp.save();
      emitToRole('warden', SOCKET_EVENTS.GATEPASS_OVERDUE, {
        gatepass_id: gp._id, student_name: gp.student_name, register_number: gp.register_number, block_name: gp.block_name,
      });
    }
    if (overdue.length) console.log(`⚠️  ${overdue.length} overdue gatepass(es) flagged`);
  } catch (err) { console.error('Gatepass cron error:', err.message); }
});

// POST /api/v1/gatepass/apply
router.post('/apply', authenticate, asyncHandler(async (req, res) => {
  const { type, destination, reason, expected_exit, expected_return, guardian_name, guardian_phone, guardian_relation } = req.body;

  // Validate outing time rules
  if (type === GATEPASS_TYPES.OUTING) {
    const returnTime = new Date(expected_return);
    const sixPM = new Date(returnTime);
    sixPM.setHours(18, 0, 0, 0);
    if (returnTime > sixPM) {
      return res.status(400).json({ success: false, message: 'Outing passes must have return time by 6:00 PM' });
    }
    const durationHrs = (returnTime - new Date(expected_exit)) / 3600000;
    if (durationHrs > 6) {
      return res.status(400).json({ success: false, message: 'Outing passes cannot exceed 6 hours' });
    }
  }

  const gatepass = await Gatepass.create({
    student_id: req.user._id,
    student_name: req.user.name,
    register_number: req.user.register_number,
    block_name: req.user.block_name,
    floor_no: req.user.floor_no,
    room_no: req.user.room_no,
    type, destination, reason, expected_exit, expected_return,
    guardian_name, guardian_phone, guardian_relation,
  });

  emitToRole('warden', SOCKET_EVENTS.DASHBOARD_UPDATE, { type: 'new_gatepass', gatepass_id: gatepass._id });
  res.status(201).json({ success: true, message: 'Gatepass application submitted', gatepass });
}));

// GET /api/v1/gatepass — list gatepasses (role-filtered)
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { status, type, page = 1, limit = 20 } = req.query;
  const query = {};
  if (req.user.role === 'student') query.student_id = req.user._id;
  else if (req.user.role === 'warden') query.block_name = req.user.block_name;
  if (status) query.status = status;
  if (type) query.type = type;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [gatepasses, total] = await Promise.all([
    Gatepass.find(query).sort({ applied_at: -1 }).skip(skip).limit(parseInt(limit)),
    Gatepass.countDocuments(query),
  ]);
  res.json({ success: true, total, page: parseInt(page), gatepasses });
}));

// GET /api/v1/gatepass/overdue
router.get('/overdue', authenticate, isWarden, asyncHandler(async (req, res) => {
  const overdue = await Gatepass.find({ is_overdue: true, status: GATEPASS_STATUS.ACTIVE, block_name: req.user.block_name });
  res.json({ success: true, count: overdue.length, overdue });
}));

// GET /api/v1/gatepass/active
router.get('/active', authenticate, asyncHandler(async (req, res) => {
  const query = { status: GATEPASS_STATUS.ACTIVE };
  if (req.user.role === 'student') query.student_id = req.user._id;
  else if (req.user.role === 'warden') query.block_name = req.user.block_name;
  const active = await Gatepass.find(query);
  res.json({ success: true, count: active.length, active });
}));

// PUT /api/v1/gatepass/:id/approve
router.put('/:id/approve', authenticate, isWarden, asyncHandler(async (req, res) => {
  const gatepass = await Gatepass.findById(req.params.id);
  if (!gatepass) return res.status(404).json({ success: false, message: 'Gatepass not found' });
  if (gatepass.status !== GATEPASS_STATUS.PENDING) {
    return res.status(400).json({ success: false, message: `Cannot approve a ${gatepass.status} gatepass` });
  }

  // Generate QR token
  const qrToken = generateQRToken({
    gp_id: gatepass._id,
    student_id: gatepass.student_id,
    type: gatepass.type,
    expected_return: gatepass.expected_return,
  });

  gatepass.status = GATEPASS_STATUS.APPROVED;
  gatepass.approved_by = req.user._id;
  gatepass.approved_at = new Date();
  gatepass.qr_token = qrToken;
  await gatepass.save();

  emitToUser(gatepass.student_id, SOCKET_EVENTS.GATEPASS_APPROVED, { gatepass_id: gatepass._id, qr_token: qrToken });
  res.json({ success: true, message: 'Gatepass approved', gatepass, qr_token: qrToken });
}));

// PUT /api/v1/gatepass/:id/reject
router.put('/:id/reject', authenticate, isWarden, asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const gatepass = await Gatepass.findById(req.params.id);
  if (!gatepass) return res.status(404).json({ success: false, message: 'Gatepass not found' });
  gatepass.status = GATEPASS_STATUS.REJECTED;
  gatepass.rejection_reason = reason;
  await gatepass.save();
  emitToUser(gatepass.student_id, SOCKET_EVENTS.GATEPASS_REJECTED, { gatepass_id: gatepass._id, reason });
  res.json({ success: true, message: 'Gatepass rejected', gatepass });
}));

// POST /api/v1/gatepass/scan/exit — guard scans QR on exit
router.post('/scan/exit', authenticate, isGuard, asyncHandler(async (req, res) => {
  const { qr_token } = req.body;
  let decoded;
  try { decoded = verifyQRToken(qr_token); } catch { return res.status(400).json({ success: false, message: 'Invalid or expired QR' }); }

  const gatepass = await Gatepass.findById(decoded.gp_id);
  if (!gatepass || gatepass.status !== GATEPASS_STATUS.APPROVED) {
    return res.status(400).json({ success: false, message: 'Gatepass not valid for exit', status: 'RED' });
  }

  gatepass.status = GATEPASS_STATUS.ACTIVE;
  gatepass.actual_exit = new Date();
  gatepass.exit_guard = req.user._id;
  await gatepass.save();

  const now = new Date();
  const timeLeft = (new Date(gatepass.expected_return) - now) / 60000;
  const scan_status = timeLeft > 30 ? 'GREEN' : timeLeft > 0 ? 'YELLOW' : 'RED';

  res.json({ success: true, status: scan_status, gatepass, message: `Exit recorded for ${gatepass.student_name}. Expected return: ${gatepass.expected_return}` });
}));

// POST /api/v1/gatepass/scan/entry — guard scans QR on return
router.post('/scan/entry', authenticate, isGuard, asyncHandler(async (req, res) => {
  const { qr_token } = req.body;
  let decoded;
  try { decoded = verifyQRToken(qr_token); } catch { return res.status(400).json({ success: false, message: 'Invalid or expired QR', status: 'RED' }); }

  const gatepass = await Gatepass.findById(decoded.gp_id);
  if (!gatepass || gatepass.status !== GATEPASS_STATUS.ACTIVE) {
    return res.status(400).json({ success: false, message: 'Gatepass not active', status: 'RED' });
  }

  const now = new Date();
  const isLate = now > new Date(gatepass.expected_return);

  gatepass.status = GATEPASS_STATUS.RETURNED;
  gatepass.actual_return = now;
  gatepass.return_guard = req.user._id;
  if (isLate) {
    gatepass.is_overdue = true;
    gatepass.late_return_count = (gatepass.late_return_count || 0) + 1;
  }
  await gatepass.save();

  res.json({ success: true, status: isLate ? 'RED' : 'GREEN', gatepass, message: `Return recorded for ${gatepass.student_name}${isLate ? ' — LATE RETURN' : ''}` });
}));

// GET /api/v1/gatepass/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const gatepass = await Gatepass.findById(req.params.id);
  if (!gatepass) return res.status(404).json({ success: false, message: 'Gatepass not found' });
  res.json({ success: true, gatepass });
}));

module.exports = router;
