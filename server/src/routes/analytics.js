const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const Gatepass = require('../models/Gatepass');
const Attendance = require('../models/Attendance');
const Room = require('../models/Room');
const HealthEvent = require('../models/HealthEvent');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { isFloorAdmin, isWarden } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');
const { COMPLAINT_STATUS, ROOM_OCCUPANCY_STATUS, ATTENDANCE_STATUS, GATEPASS_STATUS } = require('../../../shared/constants');
const { format, subDays, startOfDay, endOfDay } = require('date-fns');

// GET /api/v1/analytics/overview — main dashboard stats
router.get('/overview', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const block = req.user.role === 'hostel_admin' ? req.query.block : req.user.block_name;
  const today = format(new Date(), 'yyyy-MM-dd');
  const blockQuery = block ? { block_name: block } : {};

  const [
    totalStudents, activeComplaints, pendingGatepasses, activeGatepasses,
    todayAttendance, openEmergencies, vacantRooms, occupiedRooms,
  ] = await Promise.all([
    User.countDocuments({ ...blockQuery, role: 'student' }),
    Complaint.countDocuments({ ...blockQuery, status: { $in: [COMPLAINT_STATUS.OPEN, COMPLAINT_STATUS.ASSIGNED, COMPLAINT_STATUS.IN_PROGRESS] } }),
    Gatepass.countDocuments({ ...blockQuery, status: GATEPASS_STATUS.PENDING }),
    Gatepass.countDocuments({ ...blockQuery, status: GATEPASS_STATUS.ACTIVE }),
    Attendance.countDocuments({ ...blockQuery, date: today, status: ATTENDANCE_STATUS.PRESENT }),
    HealthEvent.countDocuments({ ...blockQuery, resolved: false }),
    Room.countDocuments({ ...blockQuery, occupancy_status: ROOM_OCCUPANCY_STATUS.VACANT }),
    Room.countDocuments({ ...blockQuery, occupancy_status: ROOM_OCCUPANCY_STATUS.OCCUPIED }),
  ]);

  // Hostel Health Score (composite)
  const slaBreach = await Complaint.countDocuments({ ...blockQuery, sla_breached: true });
  const overdueGatepasses = await Gatepass.countDocuments({ ...blockQuery, is_overdue: true, status: GATEPASS_STATUS.ACTIVE });
  const presentRate = totalStudents > 0 ? (todayAttendance / totalStudents) * 100 : 0;
  const healthScore = Math.max(0, Math.min(100, Math.round(
    (presentRate * 0.4) + ((totalStudents - activeComplaints) / Math.max(totalStudents, 1) * 100 * 0.3) +
    ((100 - slaBreach) * 0.2) + ((100 - overdueGatepasses) * 0.1)
  )));

  res.json({
    success: true,
    overview: {
      totalStudents, activeComplaints, pendingGatepasses, activeGatepasses,
      todayPresent: todayAttendance, presentRate: Math.round(presentRate),
      openEmergencies, vacantRooms, occupiedRooms, healthScore,
      slaBreaches: slaBreach, overdueGatepasses,
    },
  });
}));

// GET /api/v1/analytics/complaints/heatmap
router.get('/complaints/heatmap', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const block = req.user.role === 'hostel_admin' ? req.query.block : req.user.block_name;
  const match = block ? { block_name: block } : {};
  const heatmap = await Complaint.aggregate([
    { $match: match },
    { $group: { _id: { floor: '$floor_no', category: '$category' }, count: { $sum: 1 } } },
  ]);
  res.json({ success: true, heatmap });
}));

// GET /api/v1/analytics/attendance/trend
router.get('/attendance/trend', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const block = req.user.role === 'hostel_admin' ? req.query.block : req.user.block_name;
  const days = parseInt(req.query.days) || 7;
  const trend = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
    const query = { date };
    if (block) query.block_name = block;
    const [present, absent] = await Promise.all([
      Attendance.countDocuments({ ...query, status: ATTENDANCE_STATUS.PRESENT }),
      Attendance.countDocuments({ ...query, status: ATTENDANCE_STATUS.ABSENT }),
    ]);
    trend.push({ date, present, absent });
  }
  res.json({ success: true, trend });
}));

// GET /api/v1/analytics/rooms/summary
router.get('/rooms/summary', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const block = req.user.role === 'hostel_admin' ? req.query.block : req.user.block_name;
  const match = block ? { block_name: block } : {};
  const summary = await Room.aggregate([
    { $match: match },
    { $group: { _id: '$occupancy_status', count: { $sum: 1 } } },
  ]);
  const total = await Room.countDocuments(match);
  res.json({ success: true, total, summary });
}));

// GET /api/v1/analytics/staff/workload
router.get('/staff/workload', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const workload = await Complaint.aggregate([
    { $match: { assigned_to: { $ne: null }, status: { $ne: COMPLAINT_STATUS.RESOLVED } } },
    { $group: { _id: '$assigned_to', count: { $sum: 1 } } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'staff' } },
    { $unwind: '$staff' },
    { $project: { _id: 1, count: 1, 'staff.name': 1, 'staff.role': 1 } },
    { $sort: { count: -1 } },
  ]);
  res.json({ success: true, workload });
}));

// GET /api/v1/analytics/health-score
router.get('/health-score', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const block = req.user.role === 'hostel_admin' ? req.query.block : req.user.block_name;
  const blockQuery = block ? { block_name: block } : {};
  const today = format(new Date(), 'yyyy-MM-dd');
  const totalStudents = await User.countDocuments({ ...blockQuery, role: 'student' });
  const present = await Attendance.countDocuments({ ...blockQuery, date: today, status: ATTENDANCE_STATUS.PRESENT });

  const components = {
    attendance: totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0,
    complaints: Math.max(0, 100 - (await Complaint.countDocuments({ ...blockQuery, status: COMPLAINT_STATUS.OPEN })) * 5),
    sla: Math.max(0, 100 - (await Complaint.countDocuments({ ...blockQuery, sla_breached: true })) * 10),
    safety: Math.max(0, 100 - (await Gatepass.countDocuments({ ...blockQuery, is_overdue: true, status: GATEPASS_STATUS.ACTIVE })) * 10),
  };
  const overall = Math.round((components.attendance * 0.35) + (components.complaints * 0.3) + (components.sla * 0.2) + (components.safety * 0.15));

  res.json({ success: true, health_score: overall, components });
}));

module.exports = router;
