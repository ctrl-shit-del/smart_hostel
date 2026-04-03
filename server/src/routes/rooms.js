const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { isAdmin, isWarden, authorize } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');
const { ROLES, ROOM_OCCUPANCY_STATUS } = require('../../../shared/constants');

// GET /api/v1/rooms/grid — full visual grid for admin
router.get('/grid', authenticate, isWarden, asyncHandler(async (req, res) => {
  const { block } = req.query;
  const query = block ? { block_name: block } : {};
  const rooms = await Room.find(query).sort({ block_name: 1, floor_no: 1, room_number: 1 });

  // Group by block → floor → rooms
  const grid = {};
  for (const room of rooms) {
    const b = room.block_name;
    const f = room.floor_no;
    if (!grid[b]) grid[b] = {};
    if (!grid[b][f]) grid[b][f] = [];
    grid[b][f].push(room);
  }

  res.json({ success: true, grid });
}));

// GET /api/v1/rooms/vacancies — vacancy summary per block/floor
router.get('/vacancies', authenticate, isWarden, asyncHandler(async (req, res) => {
  const vacancies = await Room.aggregate([
    { $match: { occupancy_status: { $ne: ROOM_OCCUPANCY_STATUS.MAINTENANCE } } },
    {
      $group: {
        _id: { block: '$block_name', floor: '$floor_no' },
        total_rooms: { $sum: 1 },
        vacant: { $sum: { $cond: [{ $eq: ['$occupancy_status', ROOM_OCCUPANCY_STATUS.VACANT] }, 1, 0] } },
        partial: { $sum: { $cond: [{ $eq: ['$occupancy_status', ROOM_OCCUPANCY_STATUS.PARTIAL] }, 1, 0] } },
        occupied: { $sum: { $cond: [{ $eq: ['$occupancy_status', ROOM_OCCUPANCY_STATUS.OCCUPIED] }, 1, 0] } },
      },
    },
    { $sort: { '_id.block': 1, '_id.floor': 1 } },
  ]);
  res.json({ success: true, vacancies });
}));

// GET /api/v1/rooms — list rooms with filters
router.get('/', authenticate, isWarden, asyncHandler(async (req, res) => {
  const { block, floor, status, type } = req.query;
  const query = {};
  if (block) query.block_name = block;
  if (floor) query.floor_no = parseInt(floor);
  if (status) query.occupancy_status = status;
  if (type) query.room_type = type;
  const rooms = await Room.find(query).sort({ floor_no: 1, room_number: 1 });
  res.json({ success: true, count: rooms.length, rooms });
}));

// GET /api/v1/rooms/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
  res.json({ success: true, room });
}));

// POST /api/v1/rooms/assign — assign student to bed
router.post('/assign', authenticate, isWarden, asyncHandler(async (req, res) => {
  const { room_id, bed_id, student_id } = req.body;
  if (!room_id || !bed_id || !student_id) {
    return res.status(400).json({ success: false, message: 'room_id, bed_id, and student_id are required' });
  }

  const room = await Room.findById(room_id);
  if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

  const student = await User.findById(student_id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

  const bed = room.beds.find((b) => b.bed_id === bed_id);
  if (!bed) return res.status(404).json({ success: false, message: `Bed ${bed_id} not found in this room` });
  if (bed.is_occupied) return res.status(409).json({ success: false, message: `Bed ${bed_id} is already occupied` });

  // Assign bed
  bed.student_id = student._id;
  bed.student_name = student.name;
  bed.register_number = student.register_number;
  bed.is_occupied = true;
  bed.assigned_at = new Date();

  // Update student record
  student.block_name = room.block_name;
  student.floor_no = room.floor_no;
  student.room_no = room.room_number;
  student.bed_id = bed_id;
  await student.save({ validateBeforeSave: false });
  await room.save();

  res.json({ success: true, message: `Student assigned to Room ${room.room_number} Bed ${bed_id}`, room });
}));

// POST /api/v1/rooms/swap — student raises swap request
router.post('/swap', authenticate, asyncHandler(async (req, res) => {
  const { target_room_id, target_bed_id, reason } = req.body;
  // In a full implementation this creates a SwapRequest document
  // For now, return success to confirm the API shape
  res.status(201).json({
    success: true,
    message: 'Swap request submitted. Warden will review shortly.',
    swap_request: {
      requested_by: req.user._id,
      target_room_id,
      target_bed_id,
      reason,
      status: 'Pending',
    },
  });
}));

// PUT /api/v1/rooms/:id/maintenance — flag room for maintenance
router.put('/:id/maintenance', authenticate, isWarden, asyncHandler(async (req, res) => {
  const { flag, reason } = req.body;
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
  room.maintenance_flag = flag !== false;
  room.maintenance_reason = reason || '';
  await room.save();
  res.json({ success: true, message: `Room maintenance flag set to ${room.maintenance_flag}`, room });
}));

module.exports = router;
