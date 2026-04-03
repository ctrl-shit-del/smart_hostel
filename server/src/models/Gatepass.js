const mongoose = require('mongoose');
const { GATEPASS_TYPES, GATEPASS_STATUS } = require('../../../shared/constants');

const gatepassSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  student_name: { type: String },
  register_number: { type: String },
  block_name: { type: String },
  floor_no: { type: Number },
  room_no: { type: Number },

  // Request details
  type: { type: String, enum: Object.values(GATEPASS_TYPES), required: true },
  destination: { type: String, required: true, trim: true },
  reason: { type: String, trim: true },
  expected_exit: { type: Date, required: true },
  expected_return: { type: Date, required: true },

  // Parent details (for Leave type)
  guardian_name: { type: String },
  guardian_phone: { type: String },
  guardian_relation: { type: String },

  // Status & approval
  status: { type: String, enum: Object.values(GATEPASS_STATUS), default: GATEPASS_STATUS.PENDING },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approved_at: { type: Date },
  rejection_reason: { type: String },

  // QR Gate tracking
  qr_token: { type: String, unique: true, sparse: true },
  actual_exit: { type: Date },
  actual_return: { type: Date },
  exit_guard: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  return_guard: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Anomaly flags
  is_overdue: { type: Boolean, default: false },
  overdue_alert_sent: { type: Boolean, default: false },
  late_return_count: { type: Number, default: 0 },

  applied_at: { type: Date, default: Date.now },
}, { timestamps: true });

// Indexes
gatepassSchema.index({ student_id: 1, applied_at: -1 });
gatepassSchema.index({ status: 1 });
gatepassSchema.index({ qr_token: 1 });
gatepassSchema.index({ block_name: 1, status: 1 });
gatepassSchema.index({ expected_return: 1, status: 1 }); // for overdue cron

module.exports = mongoose.model('Gatepass', gatepassSchema);
