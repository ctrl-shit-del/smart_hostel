const mongoose = require('mongoose');
const { ROOM_TYPES, ROOM_OCCUPANCY_STATUS } = require('../../../shared/constants');

const bedSchema = new mongoose.Schema({
  bed_id: { type: String, required: true, enum: ['A', 'B', 'C', 'D', 'E', 'F'] },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  student_name: { type: String },
  register_number: { type: String },
  is_occupied: { type: Boolean, default: false },
  assigned_at: { type: Date },
}, { _id: false });

const swapHistorySchema = new mongoose.Schema({
  from_student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  to_student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason: { type: String },
  changed_at: { type: Date, default: Date.now },
}, { _id: false });

const roomSchema = new mongoose.Schema({
  block_name: { type: String, required: true, trim: true },
  floor_no: { type: Number, required: true, min: 1, max: 15 },
  room_number: { type: Number, required: true },
  room_type: { type: String, enum: Object.values(ROOM_TYPES) },

  // Bed details
  total_beds: { type: Number, required: true },
  beds: [bedSchema],

  // Status
  occupancy_status: {
    type: String,
    enum: Object.values(ROOM_OCCUPANCY_STATUS),
    default: ROOM_OCCUPANCY_STATUS.VACANT,
  },
  maintenance_flag: { type: Boolean, default: false },
  maintenance_reason: { type: String },

  // History
  swap_history: [swapHistorySchema],

  is_active: { type: Boolean, default: true },
}, { timestamps: true });

// Auto-compute occupancy status before save
roomSchema.pre('save', function () {
  const occupied = this.beds.filter((b) => b.is_occupied).length;
  const total = this.total_beds;
  if (this.maintenance_flag) {
    this.occupancy_status = ROOM_OCCUPANCY_STATUS.MAINTENANCE;
  } else if (occupied === 0) {
    this.occupancy_status = ROOM_OCCUPANCY_STATUS.VACANT;
  } else if (occupied === total) {
    this.occupancy_status = ROOM_OCCUPANCY_STATUS.OCCUPIED;
  } else {
    this.occupancy_status = ROOM_OCCUPANCY_STATUS.PARTIAL;
  }
});

// Indexes
roomSchema.index({ block_name: 1, floor_no: 1, room_number: 1 }, { unique: true });
roomSchema.index({ block_name: 1, occupancy_status: 1 });

module.exports = mongoose.model('Room', roomSchema, 'mongoose_rooms');
