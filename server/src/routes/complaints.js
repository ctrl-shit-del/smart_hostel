const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const { authenticate } = require('../middleware/auth');
const { isAdmin, isWarden, isFloorAdmin } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');
const { COMPLAINT_STATUS, SOCKET_EVENTS } = require('../../../shared/constants');
const { emitToBlock, emitToRole } = require('../utils/socket');
const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

// GET /api/v1/complaints — list (role-filtered)
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { status, category, severity, page = 1, limit = 20 } = req.query;
  const query = {};

  // Role-based filtering
  if (req.user.role === 'student') {
    query.raised_by = req.user._id;
  } else if (req.user.role === 'floor_admin') {
    query.block_name = req.user.block_name; 
    query.floor_no = req.user.floor_no;
  } else if (['warden', 'hostel_admin', 'proctor'].includes(req.user.role)) {
    const blocks = req.user.assigned_hostels_list;
    if (blocks && blocks.length > 0) {
      query.block_name = { $in: blocks };
    }
  }

  if (status) query.status = status;
  if (category) query.category = category;
  if (severity) query.severity = severity;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [complaints, total] = await Promise.all([
    Complaint.find(query).sort({ raised_at: -1 }).skip(skip).limit(parseInt(limit)).populate('raised_by', 'name register_number'),
    Complaint.countDocuments(query),
  ]);

  // Sanitize anonymous complaints for strict roles (only wardens/proctors/hostel_admins can see identities)
  const isAuthorizedViewer = ['warden', 'proctor', 'hostel_admin'].includes(req.user.role);
  const sanitizedComplaints = complaints.map(c => {
    if (c.is_anonymous && !isAuthorizedViewer && req.user._id.toString() !== c.raised_by?._id.toString()) {
      const sanitized = c.toObject();
      sanitized.raised_by = null;
      sanitized.student_name = 'Anonymous Student';
      sanitized.register_number = 'HIDDEN';
      return sanitized;
    }
    return c;
  });

  res.json({ success: true, total, page: parseInt(page), complaints: sanitizedComplaints });
}));

// GET /api/v1/complaints/analytics/heatmap
router.get('/analytics/heatmap', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const { block } = req.query;
  const match = block ? { block_name: block } : {};
  const heatmap = await Complaint.aggregate([
    { $match: match },
    { $group: { _id: { floor: '$floor_no', category: '$category' }, count: { $sum: 1 } } },
    { $sort: { '_id.floor': 1 } },
  ]);
  res.json({ success: true, heatmap });
}));

// GET /api/v1/complaints/analytics/stats
router.get('/analytics/stats', authenticate, asyncHandler(async (req, res) => {
  const matchObj = {};
  if (req.user.role === 'floor_admin') {
    matchObj.block_name = req.user.block_name;
  } else if (['warden', 'hostel_admin', 'proctor'].includes(req.user.role)) {
    const blocks = req.user.assigned_hostels_list;
    if (blocks && blocks.length > 0) {
      matchObj.block_name = { $in: blocks };
    }
  }

  const [statusBreakdown, avgResolution, slaBreaches] = await Promise.all([
    Complaint.aggregate([
      { $match: matchObj },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Complaint.aggregate([
      { $match: { ...matchObj, resolved_at: { $ne: null } } },
      { $group: { _id: null, avg_hours: { $avg: '$resolution_time_hrs' } } },
    ]),
    Complaint.countDocuments({ ...matchObj, sla_breached: true }),
  ]);
  res.json({ success: true, statusBreakdown, avgResolutionHrs: avgResolution[0]?.avg_hours || 0, slaBreaches });
}));

// POST /api/v1/complaints/classify — proxy to AI service
router.post('/classify', authenticate, asyncHandler(async (req, res) => {
  const { description } = req.body;
  try {
    const aiRes = await axios.post(`${AI_SERVICE_URL}/classify-complaint`, { description }, { timeout: 5000 });
    res.json({ success: true, ...aiRes.data });
  } catch (err) {
    // Fallback: rule-based keyword classification
    const text = description?.toLowerCase() || '';
    let category = 'Other', urgency = 0.3;
    if (/ragging|harass|bully|abuse|threat|assault/.test(text)) { category = 'Ragging / Harassment'; urgency = 0.95; }
    else if (/electric|switch|fan|light|bulb|wire|plug|socket|power/.test(text)) { category = 'Electrical'; urgency = 0.7; }
    else if (/water|pipe|leak|drain|tap|flush|toilet|plumb/.test(text)) { category = 'Plumbing'; urgency = 0.9; }
    else if (/wall|ceiling|floor|crack|door|window|lock|paint/.test(text)) { category = 'Civil'; urgency = 0.4; }
    else if (/clean|dirt|waste|garbage|sweep|mop|dust/.test(text)) { category = 'Housekeeping'; urgency = 0.3; }
    else if (/pest|cockroach|rat|mice|mosquito|insect|bug/.test(text)) { category = 'Pest Control'; urgency = 0.6; }
    else if (/wifi|internet|router|network|connection/.test(text)) { category = 'Internet'; urgency = 0.5; }
    res.json({ success: true, category, urgency_score: urgency, confidence: 0.82, source: 'fallback' });
  }
}));

// POST /api/v1/complaints — raise new complaint
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { title, description, category, severity, photos, is_anonymous } = req.body;

  // Auto-classify with AI
  let ai_category = category, ai_confidence = null, ai_urgency_score = null;
  try {
    const aiRes = await axios.post(`${AI_SERVICE_URL}/classify-complaint`, { description }, { timeout: 3000 });
    ai_category = aiRes.data.category || category;
    ai_confidence = aiRes.data.confidence;
    ai_urgency_score = aiRes.data.urgency_score;
  } catch {}

  const complaint = await Complaint.create({
    raised_by: req.user._id,
    student_name: req.user.name,
    register_number: req.user.register_number,
    block_name: req.user.block_name,
    floor_no: req.user.floor_no,
    room_no: req.user.room_no,
    title,
    description,
    category: ai_category || category,
    severity: category === 'Ragging / Harassment' ? 'Urgent' : severity,
    photos: photos || [],
    is_anonymous: !!is_anonymous,
    ai_category,
    ai_confidence,
    ai_urgency_score,
  });

  // Check for systemic issues (3+ on same floor with same category)
  const floorCount = await Complaint.countDocuments({
    block_name: req.user.block_name,
    floor_no: req.user.floor_no,
    category: complaint.category,
    status: { $ne: COMPLAINT_STATUS.RESOLVED },
  });
  if (floorCount >= 3) {
    await Complaint.updateMany(
      { block_name: req.user.block_name, floor_no: req.user.floor_no, category: complaint.category, status: { $ne: COMPLAINT_STATUS.RESOLVED } },
      { is_systemic: true }
    );
  }

  // Emit socket event
  emitToBlock(req.user.block_name, SOCKET_EVENTS.COMPLAINT_NEW, { complaint });
  emitToRole('warden', SOCKET_EVENTS.COMPLAINT_NEW, { complaint });

  res.status(201).json({ success: true, message: 'Complaint raised successfully', complaint });
}));

// GET /api/v1/complaints/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id).populate('raised_by', 'name register_number').populate('assigned_to', 'name role');
  if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
  
  const isAuthorizedViewer = ['warden', 'proctor', 'hostel_admin'].includes(req.user.role);
  if (complaint.is_anonymous && !isAuthorizedViewer && req.user._id.toString() !== complaint.raised_by?._id.toString()) {
    const sanitized = complaint.toObject();
    sanitized.raised_by = null;
    sanitized.student_name = 'Anonymous Student';
    sanitized.register_number = 'HIDDEN';
    return res.json({ success: true, complaint: sanitized });
  }

  res.json({ success: true, complaint });
}));

// PUT /api/v1/complaints/:id — update status / assign
router.put('/:id', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const { status, resolution_note, assigned_to, escalation_reason } = req.body;
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

  if (status) complaint.status = status;
  if (resolution_note) complaint.resolution_note = resolution_note;
  if (assigned_to) { complaint.assigned_to = assigned_to; complaint.assigned_at = new Date(); }
  if (escalation_reason) { complaint.escalated = true; complaint.escalation_reason = escalation_reason; complaint.escalated_at = new Date(); }

  // Check SLA breach
  if (new Date() > complaint.sla_deadline && complaint.status !== COMPLAINT_STATUS.RESOLVED) {
    complaint.sla_breached = true;
    emitToBlock(complaint.block_name, SOCKET_EVENTS.COMPLAINT_ESCALATED, { complaint_id: complaint._id, message: 'SLA breached! Complaint needs immediate attention.' });
  }

  await complaint.save();
  emitToBlock(complaint.block_name, SOCKET_EVENTS.COMPLAINT_UPDATED, { complaint_id: complaint._id, status: complaint.status });
  res.json({ success: true, message: 'Complaint updated', complaint });
}));

// POST /api/v1/complaints/:id/rate
router.post('/:id/rate', authenticate, asyncHandler(async (req, res) => {
  const { rating, feedback_note } = req.body;
  const complaint = await Complaint.findOne({ _id: req.params.id, raised_by: req.user._id });
  if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
  if (complaint.status !== COMPLAINT_STATUS.RESOLVED) {
    return res.status(400).json({ success: false, message: 'Can only rate resolved complaints' });
  }
  complaint.rating = rating;
  complaint.feedback_note = feedback_note;
  complaint.rated_at = new Date();
  await complaint.save();
  res.json({ success: true, message: 'Thank you for your feedback!' });
}));

module.exports = router;
