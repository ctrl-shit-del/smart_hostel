/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  CHATBOT CONTEXT API                                    ║
 * ║  GET /api/v1/chatbot/context                            ║
 * ║  OWNER: Backend Lead                                    ║
 * ║  BRANCH: feature/chatbot-core                           ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Returns a bundled context object for the authenticated student.
 * This is the ONLY server-side file for the chatbot.
 * All feature handlers (leave, complaint, etc.) call existing
 * /api/v1/* endpoints directly — not this file.
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Complaint = require('../models/Complaint');
const Gatepass = require('../models/Gatepass');
const Attendance = require('../models/Attendance');

// ─── GET /api/v1/chatbot/context ──────────────────────────────────────────────
router.get('/context', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = req.user;

  // Parallel fetch of all student data
  const [complaints, gatepasses, attendanceRecords] = await Promise.allSettled([
    // Active / recent complaints (last 5)
    Complaint.find({ raised_by: userId })
      .sort({ raised_at: -1 })
      .limit(5)
      .select('title category severity status raised_at is_systemic sla_breached'),

    // All gatepasses (last 5)
    Gatepass.find({ student_id: userId })
      .sort({ applied_at: -1 })
      .limit(5)
      .select('type destination status expected_exit expected_return is_overdue applied_at'),

    // Last 30 days attendance
    Attendance.find({ student_id: userId })
      .sort({ date: -1 })
      .limit(30)
      .select('date status'),
  ]);

  // ── Attendance summary ────────────────────────────────────────────────────
  const attendanceList = attendanceRecords.status === 'fulfilled' ? attendanceRecords.value : [];
  const present = attendanceList.filter((a) => a.status === 'Present').length;
  const absent  = attendanceList.filter((a) => a.status === 'Absent').length;
  const total   = attendanceList.length || 1;
  const rate    = Math.round((present / total) * 100);

  // ── Laundry schedule (deterministic by room number) ───────────────────────
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const roomNum = user.room_no || 101;
  const dhobi_day_index = roomNum % 7;
  const profab_day_index = (dhobi_day_index + 2) % 7;
  const laundry = {
    chota_dhobi: {
      day: DAYS[dhobi_day_index],
      time: '9:00 AM',
    },
    profab: {
      day: DAYS[profab_day_index],
      pickup: '10:00 AM',
      delivery: `${DAYS[(profab_day_index + 2) % 7]} 6:00 PM`,
    },
  };

  // ── Mess crowd simulation (time-of-day based) ─────────────────────────────
  const hour = new Date().getHours();
  const CROWD_SCHEDULE = [
    { range: [7,  9],  meal: 'Breakfast',       level: 'High',      pct: 65 },
    { range: [9,  12], meal: 'Post-Breakfast',   level: 'Low',       pct: 10 },
    { range: [12, 13], meal: 'Lunch Peak',       level: 'Very High', pct: 90 },
    { range: [13, 14], meal: 'Lunch',            level: 'High',      pct: 70 },
    { range: [14, 19], meal: 'Off Peak',         level: 'Low',       pct: 15 },
    { range: [19, 20], meal: 'Dinner',           level: 'High',      pct: 75 },
    { range: [20, 21], meal: 'Dinner Peak',      level: 'Very High', pct: 85 },
    { range: [21, 24], meal: 'Night Mess',       level: 'Low',       pct: 20 },
  ];
  const slot = CROWD_SCHEDULE.find(({ range: [s, e] }) => hour >= s && hour < e)
    || { meal: 'Off Peak', level: 'Low', pct: 10 };

  const mess = {
    meal: slot.meal,
    crowd_level: slot.level,
    fill_percent: slot.pct,
    recommendation:
      slot.pct < 40  ? 'Recommended to visit now' :
      slot.pct > 70  ? 'Peak hours — expect a queue' :
                       'Moderate crowd',
    caterer: user.mess_information || 'Not assigned',
  };

  // ── Build response ────────────────────────────────────────────────────────
  res.json({
    success: true,
    user: {
      name:        user.name,
      room_no:     user.room_no,
      floor_no:    user.floor_no,
      block_name:  user.block_name,
      bed_type:    user.bed_type,
      bed_id:      user.bed_id,
      department:  user.department,
      mess_information: user.mess_information,
    },
    complaints: complaints.status === 'fulfilled' ? complaints.value : [],
    gatepass:   gatepasses.status === 'fulfilled' ? gatepasses.value : [],
    attendance: {
      present,
      absent,
      total:    attendanceList.length,
      rate,
      last7days: attendanceList.slice(0, 7),
      alert:    rate < 75 ? 'Attendance below 75%' : null,
    },
    laundry,
    mess,
  });
}));

module.exports = router;
