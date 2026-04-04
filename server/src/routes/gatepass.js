const express = require('express');
const cron = require('node-cron');

const Gatepass = require('../models/Gatepass');
const Student = require('../models/Student');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { authorize, isWarden, isProctor, isGuard } = require('../middleware/rbac');
const { generateQRToken, verifyQRToken } = require('../utils/jwt');
const { emitToUser, emitToRole } = require('../utils/socket');
const { transcribeAudio, synthesizeSpeech } = require('../services/sarvam');
const {
  ROLES,
  GATEPASS_STATUS,
  GATEPASS_TYPES,
  SOCKET_EVENTS,
  LATE_RETURN_STATUS,
  LATE_RETURN_DECISION,
  LATE_RETURN_CALL_STATUS,
} = require('../../../shared/constants');

const router = express.Router();
const canSubmitLateExcuse = authorize(ROLES.STUDENT);

const addHours = (dateLike, hours) => {
  const date = new Date(dateLike);
  date.setHours(date.getHours() + hours);
  return date;
};

const isBlank = (value) => typeof value !== 'string' || !value.trim();

const sanitizeText = (value, max = 500) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, max);
};

const defaultWardenMessage = (decision) => {
  switch (decision) {
    case LATE_RETURN_DECISION.CLEAR:
      return 'Late arrival reviewed. You may proceed.';
    case LATE_RETURN_DECISION.CALL_STUDENT:
      return 'Late arrival needs a portal call follow-up with the warden.';
    case LATE_RETURN_DECISION.MEET_WARDEN:
      return 'Late arrival recorded. Please meet the warden.';
    default:
      return 'Late arrival recorded. Awaiting warden review.';
  }
};

const defaultSecurityMessage = (gatepass) => {
  if (gatepass.type !== GATEPASS_TYPES.LEAVE) {
    return 'Gatepass verified.';
  }

  if (!gatepass.actual_return || new Date(gatepass.actual_return) <= new Date(gatepass.expected_return)) {
    return 'Gatepass verified.';
  }

  const decision = gatepass.late_return?.warden_decision || LATE_RETURN_DECISION.PENDING;
  return gatepass.late_return?.warden_message || defaultWardenMessage(decision);
};

const getLateExcuseDeadline = (gatepass) => addHours(gatepass.expected_return, 1);
const getLateFollowUpDueAt = (gatepass) => addHours(gatepass.expected_return, 24);

const isLateLeave = (gatepass) => (
  gatepass.type === GATEPASS_TYPES.LEAVE &&
  gatepass.actual_return &&
  new Date(gatepass.actual_return) > new Date(gatepass.expected_return)
);

const summarizeTranscript = (transcript) => {
  const clean = sanitizeText(transcript, 3000);
  if (!clean) return '';

  const parts = clean
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 2) return clean.slice(0, 280);
  return `${parts[0]} ${parts[1]}`.slice(0, 280);
};

const normalizeLateReturnState = (gatepass, now = new Date()) => {
  if (!gatepass.late_return) gatepass.late_return = {};
  const late = gatepass.late_return;

  if (!isLateLeave(gatepass)) {
    late.excuse_status = LATE_RETURN_STATUS.NOT_APPLICABLE;
    late.warden_decision = late.warden_decision || LATE_RETURN_DECISION.PENDING;
    late.call_status = late.call_status || LATE_RETURN_CALL_STATUS.NOT_REQUIRED;
    late.security_message = late.security_message || defaultSecurityMessage(gatepass);
    return gatepass;
  }

  if (!late.excuse_deadline_at) late.excuse_deadline_at = getLateExcuseDeadline(gatepass);
  if (!late.follow_up_call_due_at) late.follow_up_call_due_at = getLateFollowUpDueAt(gatepass);
  if (!late.warden_decision) late.warden_decision = LATE_RETURN_DECISION.PENDING;

  if (!isBlank(late.excuse_text)) {
    late.excuse_status = late.reviewed_at
      ? LATE_RETURN_STATUS.REVIEWED
      : LATE_RETURN_STATUS.SUBMITTED;
  } else if (now <= new Date(late.excuse_deadline_at)) {
    late.excuse_status = LATE_RETURN_STATUS.PENDING_STUDENT;
  } else if (!late.reviewed_at) {
    late.excuse_status = LATE_RETURN_STATUS.EXPIRED;
  }

  if (!late.call_status) {
    late.call_status = LATE_RETURN_CALL_STATUS.NOT_REQUIRED;
  }

  const shouldTriggerFollowUp =
    late.excuse_status === LATE_RETURN_STATUS.EXPIRED &&
    now >= new Date(late.follow_up_call_due_at) &&
    [LATE_RETURN_CALL_STATUS.NOT_REQUIRED, LATE_RETURN_CALL_STATUS.DECLINED].includes(late.call_status);

  if (shouldTriggerFollowUp) {
    late.call_status = LATE_RETURN_CALL_STATUS.PENDING;
    late.warden_decision = LATE_RETURN_DECISION.CALL_STUDENT;
  }

  if (
    [LATE_RETURN_CALL_STATUS.PENDING, LATE_RETURN_CALL_STATUS.RINGING].includes(late.call_status) &&
    !late.warden_message
  ) {
    late.warden_message = defaultWardenMessage(LATE_RETURN_DECISION.CALL_STUDENT);
  }

  if (!late.security_message) {
    late.security_message = late.warden_message || defaultSecurityMessage(gatepass);
  }

  return gatepass;
};

const getDisplayQrValue = (gatepass) => {
  if (gatepass.type === GATEPASS_TYPES.OUTING) {
    return gatepass.register_number;
  }

  return gatepass.qr_code_id || gatepass.qr_token || gatepass.register_number;
};

const serializeGatepass = (gatepass) => {
  normalizeLateReturnState(gatepass);
  const payload = gatepass.toObject ? gatepass.toObject() : { ...gatepass };
  const late = payload.late_return || {};
  const approvedByLabel = payload.approved_by_name
    ? `${payload.approved_by_name}${payload.approved_by_role ? ` (${payload.approved_by_role})` : ''}`
    : null;

  return {
    ...payload,
    late_return: late,
    late_return_window_deadline: late.excuse_deadline_at || null,
    can_submit_late_excuse:
      payload.type === GATEPASS_TYPES.LEAVE &&
      !!payload.actual_return &&
      !!payload.is_overdue &&
      late.excuse_status === LATE_RETURN_STATUS.PENDING_STUDENT,
    security_message: late.security_message || defaultSecurityMessage(payload),
    approved_by_label: approvedByLabel,
    qr_display_value: getDisplayQrValue(payload),
  };
};

const emitLateReturnUpdate = (gatepass, updateType) => {
  const payload = {
    type: updateType,
    gatepass_id: gatepass._id,
    student_name: gatepass.student_name,
    register_number: gatepass.register_number,
    gatepass: serializeGatepass(gatepass),
  };

  emitToUser(gatepass.student_id, SOCKET_EVENTS.GATEPASS_LATE_RETURN_UPDATED, payload);
  emitToRole(ROLES.WARDEN, SOCKET_EVENTS.GATEPASS_LATE_RETURN_UPDATED, payload);
};

const ensureNumericQrId = async (gatepass) => {
  if (gatepass.qr_code_id) return gatepass.qr_code_id;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `${Math.floor(100000000 + Math.random() * 900000000)}`;
    const exists = await Gatepass.exists({ qr_code_id: candidate, _id: { $ne: gatepass._id } });
    if (!exists) {
      gatepass.qr_code_id = candidate;
      return candidate;
    }
  }

  throw new Error('Unable to allocate QR code ID');
};

const parseScanCode = (body = {}) => (
  body.qr_code_id ||
  body.qrCodeId ||
  body.qr_token ||
  body.token ||
  body.code ||
  ''
);

const resolveGatepassFromScan = async (body = {}, options = {}) => {
  const rawCode = `${parseScanCode(body)}`.trim();
  if (!rawCode) {
    return { gatepass: null, rawCode };
  }

  const statuses = Array.isArray(options.statuses) && options.statuses.length ? options.statuses : null;

  if (/^\d+$/.test(rawCode)) {
    const gatepass = await Gatepass.findOne({ qr_code_id: rawCode });
    return { gatepass, rawCode };
  }

  try {
    const decoded = verifyQRToken(rawCode);
    const gatepass = await Gatepass.findById(decoded.gp_id);
    return { gatepass, rawCode };
  } catch (_err) {
    const query = { register_number: rawCode.toUpperCase() };
    if (statuses) {
      query.status = { $in: statuses };
    }

    const gatepass = await Gatepass.findOne(query).sort({ applied_at: -1 });
    return { gatepass, rawCode };
  }
};

const ensureGatepassAccess = (gatepass, user) => {
  if (!gatepass) return { allowed: false, status: 404, message: 'Gatepass not found' };

  if (user.role === ROLES.STUDENT && `${gatepass.student_id}` !== `${user._id}`) {
    return { allowed: false, status: 403, message: 'You can only manage your own gatepass' };
  }

  if (user.role === ROLES.WARDEN && gatepass.block_name !== user.block_name) {
    return { allowed: false, status: 403, message: 'This gatepass belongs to a different block' };
  }

  return { allowed: true };
};

const ensureLateReturnAccess = (gatepass, user) => {
  const base = ensureGatepassAccess(gatepass, user);
  if (!base.allowed) return base;

  if (gatepass.type !== GATEPASS_TYPES.LEAVE) {
    return { allowed: false, status: 400, message: 'Late return messaging is available only for leave gatepasses' };
  }

  return { allowed: true };
};

const buildScanResponse = (gatepass, message, status) => ({
  success: true,
  status,
  message,
  gatepass: serializeGatepass(gatepass),
  security_message: gatepass.late_return?.security_message || defaultSecurityMessage(gatepass),
});

const applyOutingTimingViolation = async (gatepass, reason) => {
  if (gatepass.type !== GATEPASS_TYPES.OUTING) {
    return null;
  }

  const student = await Student.findById(gatepass.student_id);
  if (!student) {
    return null;
  }

  if (!gatepass.timing_violation_flagged) {
    gatepass.timing_violation_flagged = true;
    gatepass.timing_violation_reason = reason;
    gatepass.timing_violation_flagged_at = new Date();

    student.outing_flag_count = (student.outing_flag_count || 0) + 1;
    student.is_flagged = student.outing_flag_count > 0;

    if (student.outing_flag_count >= 2) {
      student.is_active = false;
      student.credentials_disabled_at = new Date();
      student.credentials_disabled_reason = 'Disabled after 2 outing timing violations. Please visit the hostel office.';
    }

    await Promise.all([gatepass.save(), student.save()]);
  }

  return {
    count: student.outing_flag_count || 0,
    locked: student.is_active === false,
    disabled_reason: student.credentials_disabled_reason || null,
  };
};

// Cron: check overdue gatepasses every 15 minutes.
cron.schedule('*/15 * * * *', async () => {
  try {
    const overdue = await Gatepass.find({
      status: GATEPASS_STATUS.ACTIVE,
      expected_return: { $lt: new Date() },
      overdue_alert_sent: false,
    });

    for (const gatepass of overdue) {
      gatepass.is_overdue = true;
      gatepass.overdue_alert_sent = true;
      normalizeLateReturnState(gatepass);
      await gatepass.save();

      emitToRole(ROLES.WARDEN, SOCKET_EVENTS.GATEPASS_OVERDUE, {
        gatepass_id: gatepass._id,
        student_name: gatepass.student_name,
        register_number: gatepass.register_number,
        block_name: gatepass.block_name,
      });
    }
  } catch (err) {
    console.error('Gatepass overdue cron error:', err.message);
  }
});

// Cron: flag late leaves for portal follow-up after 24 hours if no excuse was submitted.
cron.schedule('*/30 * * * *', async () => {
  try {
    const now = new Date();
    const candidates = await Gatepass.find({
      type: GATEPASS_TYPES.LEAVE,
      status: GATEPASS_STATUS.RETURNED,
      is_overdue: true,
      $and: [
        {
          $or: [
            { 'late_return.call_status': { $exists: false } },
            { 'late_return.call_status': LATE_RETURN_CALL_STATUS.NOT_REQUIRED },
            { 'late_return.call_status': LATE_RETURN_CALL_STATUS.DECLINED },
          ],
        },
        {
          $or: [
            { 'late_return.excuse_text': { $exists: false } },
            { 'late_return.excuse_text': '' },
          ],
        },
      ],
      expected_return: { $lt: addHours(now, -24) },
    });

    for (const gatepass of candidates) {
      normalizeLateReturnState(gatepass, now);
      gatepass.late_return.call_status = LATE_RETURN_CALL_STATUS.PENDING;
      gatepass.late_return.warden_decision = LATE_RETURN_DECISION.CALL_STUDENT;
      gatepass.late_return.warden_message =
        gatepass.late_return.warden_message || defaultWardenMessage(LATE_RETURN_DECISION.CALL_STUDENT);
      gatepass.late_return.security_message = gatepass.late_return.warden_message;
      await gatepass.save();

      emitToRole(ROLES.WARDEN, SOCKET_EVENTS.DASHBOARD_UPDATE, {
        type: 'late_return_follow_up_due',
        gatepass_id: gatepass._id,
      });
    }
  } catch (err) {
    console.error('Gatepass follow-up cron error:', err.message);
  }
});

// POST /api/v1/gatepass/apply
router.post('/apply', authenticate, asyncHandler(async (req, res) => {
  const {
    type,
    destination,
    reason,
    expected_exit,
    expected_return,
    guardian_name,
    guardian_phone,
    guardian_relation,
    register_number,
  } = req.body;

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

  let studentUser = req.user;
  if (register_number && register_number !== req.user.register_number) {
    const override = await Student.findOne({ register_number: register_number.toUpperCase() });
    if (!override) {
      return res.status(404).json({ success: false, message: 'Student register number not found' });
    }
    studentUser = override;
  }

  const gatepass = await Gatepass.create({
    student_id: studentUser._id,
    student_name: studentUser.name,
    register_number: studentUser.register_number,
    block_name: studentUser.block_name || studentUser.block,
    floor_no: studentUser.floor_no || studentUser.floor,
    room_no: studentUser.room_no,
    type,
    destination,
    reason,
    expected_exit,
    expected_return,
    guardian_name,
    guardian_phone,
    guardian_relation,
  });

  emitToRole(ROLES.PROCTOR, SOCKET_EVENTS.DASHBOARD_UPDATE, {
    type: 'new_gatepass',
    gatepass_id: gatepass._id,
    student_name: gatepass.student_name,
    register_number: gatepass.register_number,
  });
  res.status(201).json({
    success: true,
    message: 'Gatepass application submitted',
    gatepass: serializeGatepass(gatepass),
  });
}));

// GET /api/v1/gatepass — list gatepasses (role-filtered)
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { status, type, page = 1, limit = 20 } = req.query;
  const query = {};

  if (req.user.role === ROLES.STUDENT) query.student_id = req.user._id;
  else if (req.user.role === ROLES.WARDEN) query.block_name = req.user.block_name;
  else if (req.user.role === ROLES.PROCTOR && req.user.block_name) query.block_name = req.user.block_name;

  if (status) query.status = status;
  if (type) query.type = type;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const [gatepasses, total] = await Promise.all([
    Gatepass.find(query).sort({ applied_at: -1 }).skip(skip).limit(parseInt(limit, 10)),
    Gatepass.countDocuments(query),
  ]);

  res.json({
    success: true,
    total,
    page: parseInt(page, 10),
    gatepasses: gatepasses.map(serializeGatepass),
  });
}));

// GET /api/v1/gatepass/late-arrivals
router.get('/late-arrivals', authenticate, isWarden, asyncHandler(async (req, res) => {
  const query = {
    type: GATEPASS_TYPES.LEAVE,
    is_overdue: true,
  };

  if (req.user.role === ROLES.WARDEN) {
    query.block_name = req.user.block_name;
  }

  const gatepasses = await Gatepass.find(query).sort({ actual_return: -1, expected_return: -1 });
  res.json({
    success: true,
    lateArrivals: gatepasses.map(serializeGatepass),
  });
}));

// GET /api/v1/gatepass/overdue
router.get('/overdue', authenticate, isWarden, asyncHandler(async (req, res) => {
  const query = { is_overdue: true, status: GATEPASS_STATUS.ACTIVE };
  if (req.user.role === ROLES.WARDEN) query.block_name = req.user.block_name;
  const overdue = await Gatepass.find(query);
  res.json({ success: true, count: overdue.length, overdue: overdue.map(serializeGatepass) });
}));

// GET /api/v1/gatepass/active
router.get('/active', authenticate, asyncHandler(async (req, res) => {
  const query = { status: GATEPASS_STATUS.ACTIVE };
  if (req.user.role === ROLES.STUDENT) query.student_id = req.user._id;
  else if (req.user.role === ROLES.WARDEN) query.block_name = req.user.block_name;

  const active = await Gatepass.find(query);
  res.json({ success: true, count: active.length, active: active.map(serializeGatepass) });
}));

// GET /api/v1/gatepass/qr/:qrCodeId
router.get('/qr/:qrCodeId', authenticate, asyncHandler(async (req, res) => {
  const gatepass = await Gatepass.findOne({ qr_code_id: req.params.qrCodeId });
  if (!gatepass) {
    return res.status(404).json({ success: false, message: 'Gatepass not found for this QR code' });
  }

  const access = ensureGatepassAccess(gatepass, req.user);
  const canBypassBlockScope = [ROLES.GUARD, ROLES.SECURITY_INCHARGE].includes(req.user.role);
  if (!access.allowed && !canBypassBlockScope) {
    return res.status(access.status).json({ success: false, message: access.message });
  }

  res.json({
    success: true,
    gatepass: serializeGatepass(gatepass),
    security_message: gatepass.late_return?.security_message || defaultSecurityMessage(gatepass),
  });
}));

// PUT /api/v1/gatepass/:id/approve
router.put('/:id/approve', authenticate, isProctor, asyncHandler(async (req, res) => {
  const gatepass = await Gatepass.findById(req.params.id);
  if (!gatepass) {
    return res.status(404).json({ success: false, message: 'Gatepass not found' });
  }

  if (req.user.role === ROLES.PROCTOR && req.user.block_name && gatepass.block_name !== req.user.block_name) {
    return res.status(403).json({ success: false, message: 'This gatepass belongs to a different block' });
  }

  if (gatepass.status !== GATEPASS_STATUS.PENDING) {
    return res.status(400).json({ success: false, message: `Cannot approve a ${gatepass.status} gatepass` });
  }

  const qrToken = generateQRToken({
    gp_id: gatepass._id,
    student_id: gatepass.student_id,
    type: gatepass.type,
    expected_return: gatepass.expected_return,
  });

  await ensureNumericQrId(gatepass);

  gatepass.status = GATEPASS_STATUS.APPROVED;
  gatepass.approved_by = req.user._id;
  gatepass.approved_by_name = req.user.name;
  gatepass.approved_by_role = req.user.role;
  gatepass.approved_at = new Date();
  gatepass.qr_token = qrToken;
  normalizeLateReturnState(gatepass);
  await gatepass.save();

  emitToUser(gatepass.student_id, SOCKET_EVENTS.GATEPASS_APPROVED, {
    gatepass_id: gatepass._id,
    qr_token: qrToken,
    qr_code_id: gatepass.qr_code_id,
    approved_by_name: gatepass.approved_by_name,
    approved_by_role: gatepass.approved_by_role,
  });

  res.json({
    success: true,
    message: 'Gatepass approved by proctor',
    gatepass: serializeGatepass(gatepass),
    qr_token: qrToken,
    qr_code_id: gatepass.qr_code_id,
  });
}));

// PUT /api/v1/gatepass/:id/reject
router.put('/:id/reject', authenticate, isProctor, asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const gatepass = await Gatepass.findById(req.params.id);
  if (!gatepass) {
    return res.status(404).json({ success: false, message: 'Gatepass not found' });
  }

  if (req.user.role === ROLES.PROCTOR && req.user.block_name && gatepass.block_name !== req.user.block_name) {
    return res.status(403).json({ success: false, message: 'This gatepass belongs to a different block' });
  }

  gatepass.status = GATEPASS_STATUS.REJECTED;
  gatepass.rejection_reason = reason;
  gatepass.approved_by = req.user._id;
  gatepass.approved_by_name = req.user.name;
  gatepass.approved_by_role = req.user.role;
  await gatepass.save();

  emitToUser(gatepass.student_id, SOCKET_EVENTS.GATEPASS_REJECTED, {
    gatepass_id: gatepass._id,
    reason,
    approved_by_name: gatepass.approved_by_name,
    approved_by_role: gatepass.approved_by_role,
  });
  res.json({ success: true, message: 'Gatepass rejected by proctor', gatepass: serializeGatepass(gatepass) });
}));

// POST /api/v1/gatepass/:id/late-excuse
router.post('/:id/late-excuse', authenticate, canSubmitLateExcuse, asyncHandler(async (req, res) => {
  const gatepass = await Gatepass.findById(req.params.id);
  const access = ensureLateReturnAccess(gatepass, req.user);
  if (!access.allowed) {
    return res.status(access.status).json({ success: false, message: access.message });
  }

  if (!gatepass.actual_return || !isLateLeave(gatepass)) {
    return res.status(400).json({ success: false, message: 'Late return excuse is only available after a late leave return is scanned' });
  }

  normalizeLateReturnState(gatepass);

  if (gatepass.late_return.excuse_status !== LATE_RETURN_STATUS.PENDING_STUDENT) {
    return res.status(400).json({ success: false, message: 'The one-hour late message window has already closed' });
  }

  const excuseText = sanitizeText(req.body.excuse_text, 600);
  if (!excuseText) {
    return res.status(400).json({ success: false, message: 'Please enter the reason for the late return' });
  }

  gatepass.late_return.excuse_text = excuseText;
  gatepass.late_return.excuse_submitted_at = new Date();
  gatepass.late_return.excuse_status = LATE_RETURN_STATUS.SUBMITTED;
  gatepass.late_return.warden_decision = LATE_RETURN_DECISION.PENDING;
  gatepass.late_return.warden_message = 'Late return message received. The warden will review it shortly.';
  gatepass.late_return.security_message = gatepass.late_return.warden_message;
  gatepass.late_return.call_status = LATE_RETURN_CALL_STATUS.NOT_REQUIRED;
  await gatepass.save();

  emitToRole(ROLES.WARDEN, SOCKET_EVENTS.DASHBOARD_UPDATE, {
    type: 'late_return_excuse_submitted',
    gatepass_id: gatepass._id,
  });
  emitLateReturnUpdate(gatepass, 'late_return_excuse_submitted');

  res.json({
    success: true,
    message: 'Late return message sent to the warden',
    gatepass: serializeGatepass(gatepass),
  });
}));

// PUT /api/v1/gatepass/:id/late-review
router.put('/:id/late-review', authenticate, isWarden, asyncHandler(async (req, res) => {
  const gatepass = await Gatepass.findById(req.params.id);
  const access = ensureLateReturnAccess(gatepass, req.user);
  if (!access.allowed) {
    return res.status(access.status).json({ success: false, message: access.message });
  }

  if (!gatepass.actual_return || !isLateLeave(gatepass)) {
    return res.status(400).json({ success: false, message: 'Only late leave returns can be reviewed here' });
  }

  const decision = Object.values(LATE_RETURN_DECISION).includes(req.body.decision)
    ? req.body.decision
    : LATE_RETURN_DECISION.MEET_WARDEN;
  const message = sanitizeText(req.body.message, 300) || defaultWardenMessage(decision);

  normalizeLateReturnState(gatepass);
  gatepass.late_return.excuse_status = LATE_RETURN_STATUS.REVIEWED;
  gatepass.late_return.warden_decision = decision;
  gatepass.late_return.reviewed_by = req.user._id;
  gatepass.late_return.reviewed_at = new Date();
  gatepass.late_return.warden_message = message;
  gatepass.late_return.security_message = message;

  if (decision === LATE_RETURN_DECISION.CALL_STUDENT) {
    gatepass.late_return.call_status = LATE_RETURN_CALL_STATUS.PENDING;
  } else {
    gatepass.late_return.call_status = LATE_RETURN_CALL_STATUS.NOT_REQUIRED;
  }

  await gatepass.save();
  emitLateReturnUpdate(gatepass, 'late_return_reviewed');

  res.json({
    success: true,
    message: 'Late return decision saved',
    gatepass: serializeGatepass(gatepass),
  });
}));

// POST /api/v1/gatepass/:id/late-call
router.post('/:id/late-call', authenticate, isWarden, asyncHandler(async (req, res) => {
  const gatepass = await Gatepass.findById(req.params.id);
  const access = ensureLateReturnAccess(gatepass, req.user);
  if (!access.allowed) {
    return res.status(access.status).json({ success: false, message: access.message });
  }

  normalizeLateReturnState(gatepass);

  const notPicked = req.body.not_picked === true;
  const language = sanitizeText(req.body.language, 40);
  const explicitMessage = sanitizeText(req.body.message, 300);
  const explicitDecision = Object.values(LATE_RETURN_DECISION).includes(req.body.decision)
    ? req.body.decision
    : null;
  const transcriptFromBody = sanitizeText(req.body.transcript, 4000);
  const audioBase64 = typeof req.body.audio_base64 === 'string' ? req.body.audio_base64 : '';
  const audioMimeType = sanitizeText(req.body.audio_mime_type, 80);

  let transcript = transcriptFromBody;
  if (!notPicked && !transcript && audioBase64) {
    const transcription = await transcribeAudio({
      audioBase64,
      mimeType: audioMimeType,
      languageHint: language,
    });
    transcript = sanitizeText(transcription.transcript, 4000);
  }

  gatepass.late_return.call_attempted_at = new Date();
  gatepass.late_return.call_session_id = sanitizeText(req.body.session_id, 120) || gatepass.late_return.call_session_id;
  gatepass.late_return.call_started_at = req.body.started_at ? new Date(req.body.started_at) : gatepass.late_return.call_started_at;
  gatepass.late_return.call_ended_at = req.body.ended_at ? new Date(req.body.ended_at) : new Date();
  gatepass.late_return.call_language = language || gatepass.late_return.call_language;
  gatepass.late_return.call_audio_mime_type = audioMimeType || gatepass.late_return.call_audio_mime_type;

  if (notPicked) {
    gatepass.late_return.call_status = LATE_RETURN_CALL_STATUS.NOT_PICKED;
    gatepass.late_return.call_summary = 'Call not picked';
    gatepass.late_return.call_not_picked_reason =
      sanitizeText(req.body.not_picked_reason, 200) || 'Student did not pick up the portal call.';
    gatepass.late_return.warden_decision = LATE_RETURN_DECISION.MEET_WARDEN;
    gatepass.late_return.warden_message =
      explicitMessage || 'Call not picked. Please meet the warden.';
    gatepass.late_return.security_message = gatepass.late_return.warden_message;
  } else {
    if (!transcript) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a transcript, recording, or mark the call as not picked.',
      });
    }

    const nextDecision = explicitDecision || gatepass.late_return.warden_decision || LATE_RETURN_DECISION.CALL_STUDENT;
    gatepass.late_return.call_status = LATE_RETURN_CALL_STATUS.COMPLETED;
    gatepass.late_return.call_transcript = transcript;
    gatepass.late_return.call_summary = summarizeTranscript(transcript);
    gatepass.late_return.warden_decision = nextDecision;

    if (explicitMessage) {
      gatepass.late_return.warden_message = explicitMessage;
    } else if (!gatepass.late_return.warden_message) {
      gatepass.late_return.warden_message = defaultWardenMessage(nextDecision);
    }
    gatepass.late_return.security_message = gatepass.late_return.warden_message;
  }

  await gatepass.save();
  emitLateReturnUpdate(gatepass, 'late_return_call_saved');

  res.json({
    success: true,
    message: 'Late follow-up call outcome saved',
    gatepass: serializeGatepass(gatepass),
  });
}));

// GET /api/v1/gatepass/:id/late-message-audio
router.get('/:id/late-message-audio', authenticate, asyncHandler(async (req, res) => {
  const gatepass = await Gatepass.findById(req.params.id);
  const access = ensureGatepassAccess(gatepass, req.user);
  if (!access.allowed) {
    return res.status(access.status).json({ success: false, message: access.message });
  }

  const text =
    gatepass?.late_return?.warden_message ||
    gatepass?.late_return?.security_message ||
    defaultSecurityMessage(gatepass);

  const speech = await synthesizeSpeech({
    text,
    languageCode: req.query.language || gatepass?.late_return?.call_language || 'en-IN',
  });

  res.json({
    success: true,
    audio_base64: speech.audioBase64,
    mime_type: speech.mimeType,
    text,
  });
}));

// POST /api/v1/gatepass/scan/exit — security scans QR on exit
router.post('/scan/exit', authenticate, isGuard, asyncHandler(async (req, res) => {
  const { gatepass } = await resolveGatepassFromScan(req.body, { statuses: [GATEPASS_STATUS.APPROVED] });
  if (!gatepass || gatepass.status !== GATEPASS_STATUS.APPROVED) {
    return res.status(400).json({ success: false, message: 'Gatepass not valid for exit', status: 'RED' });
  }

  const now = new Date();
  if (gatepass.type === GATEPASS_TYPES.OUTING && now > new Date(gatepass.expected_return)) {
    const violation = await applyOutingTimingViolation(
      gatepass,
      'Attempted exit scan after the approved outing window had ended.',
    );

    return res.status(403).json({
      success: false,
      message: violation?.locked
        ? 'Outing QR expired. Student credentials are now disabled. Please visit the hostel office.'
        : 'Outing QR expired. This pass can no longer be scanned after the approved return time.',
      status: 'RED',
      flag_count: violation?.count || 0,
      credentials_locked: violation?.locked || false,
      disabled_reason: violation?.disabled_reason || null,
      student_name: gatepass.student_name,
      register_number: gatepass.register_number,
    });
  }

  gatepass.status = GATEPASS_STATUS.ACTIVE;
  gatepass.actual_exit = now;
  gatepass.exit_guard = req.user._id;
  normalizeLateReturnState(gatepass);
  await gatepass.save();

  const timeLeft = (new Date(gatepass.expected_return) - now) / 60000;
  const scanStatus = timeLeft > 30 ? 'GREEN' : timeLeft > 0 ? 'YELLOW' : 'RED';

  res.json(buildScanResponse(
    gatepass,
    `Exit recorded for ${gatepass.student_name}. Expected return: ${new Date(gatepass.expected_return).toLocaleString()}`,
    scanStatus,
  ));
}));

// POST /api/v1/gatepass/scan/entry — security scans QR on return
router.post('/scan/entry', authenticate, isGuard, asyncHandler(async (req, res) => {
  const { gatepass } = await resolveGatepassFromScan(req.body, { statuses: [GATEPASS_STATUS.ACTIVE] });
  if (!gatepass || gatepass.status !== GATEPASS_STATUS.ACTIVE) {
    return res.status(400).json({ success: false, message: 'Gatepass not active', status: 'RED' });
  }

  const now = new Date();
  if (gatepass.type === GATEPASS_TYPES.OUTING && now > new Date(gatepass.expected_return)) {
    const violation = await applyOutingTimingViolation(
      gatepass,
      'Attempted entry scan after the approved outing return time had ended.',
    );

    return res.status(403).json({
      success: false,
      message: violation?.locked
        ? 'Outing time exceeded. Credentials disabled after 2 flags. Student must visit the hostel office.'
        : 'Outing time exceeded. QR cannot be scanned after the approved outing time.',
      status: 'RED',
      flag_count: violation?.count || 0,
      credentials_locked: violation?.locked || false,
      disabled_reason: violation?.disabled_reason || null,
      student_name: gatepass.student_name,
      register_number: gatepass.register_number,
    });
  }

  const isLate = now > new Date(gatepass.expected_return);

  gatepass.status = GATEPASS_STATUS.RETURNED;
  gatepass.actual_return = now;
  gatepass.return_guard = req.user._id;
  if (isLate) {
    gatepass.is_overdue = true;
    gatepass.late_return_count = (gatepass.late_return_count || 0) + 1;
  }

  normalizeLateReturnState(gatepass, now);
  await gatepass.save();

  if (isLate) {
    emitLateReturnUpdate(gatepass, 'late_return_recorded');
  }

  const suffix = isLate ? ' - LATE RETURN' : '';
  res.json(buildScanResponse(
    gatepass,
    `Return recorded for ${gatepass.student_name}${suffix}`,
    isLate ? 'RED' : 'GREEN',
  ));
}));

// GET /api/v1/gatepass/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const gatepass = await Gatepass.findById(req.params.id);
  const access = ensureGatepassAccess(gatepass, req.user);
  if (!access.allowed) {
    return res.status(access.status).json({ success: false, message: access.message });
  }

  res.json({ success: true, gatepass: serializeGatepass(gatepass) });
}));

module.exports = router;
