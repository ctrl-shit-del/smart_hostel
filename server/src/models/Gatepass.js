const mongoose = require('mongoose');
const {
  GATEPASS_TYPES,
  GATEPASS_STATUS,
  LATE_RETURN_STATUS,
  LATE_RETURN_DECISION,
  LATE_RETURN_CALL_STATUS,
} = require('../../../shared/constants');

const gatepassSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
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
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  approved_by_name: { type: String, trim: true },
  approved_by_role: { type: String, trim: true },
  approved_at: { type: Date },
  rejection_reason: { type: String },

  // QR Gate tracking
  qr_token: { type: String, unique: true, sparse: true },
  qr_code_id: { type: String, unique: true, sparse: true },
  actual_exit: { type: Date },
  actual_return: { type: Date },
  exit_guard: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  return_guard: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },

  // Anomaly flags
  is_overdue: { type: Boolean, default: false },
  overdue_alert_sent: { type: Boolean, default: false },
  late_return_count: { type: Number, default: 0 },
  timing_violation_flagged: { type: Boolean, default: false },
  timing_violation_reason: { type: String, trim: true },
  timing_violation_flagged_at: { type: Date },

  late_return: {
    excuse_text: { type: String, trim: true },
    excuse_submitted_at: { type: Date },
    excuse_deadline_at: { type: Date },
    excuse_status: {
      type: String,
      enum: Object.values(LATE_RETURN_STATUS),
      default: LATE_RETURN_STATUS.NOT_APPLICABLE,
    },
    warden_decision: {
      type: String,
      enum: Object.values(LATE_RETURN_DECISION),
      default: LATE_RETURN_DECISION.PENDING,
    },
    warden_message: { type: String, trim: true },
    security_message: { type: String, trim: true },
    reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    reviewed_at: { type: Date },
    follow_up_call_due_at: { type: Date },
    call_status: {
      type: String,
      enum: Object.values(LATE_RETURN_CALL_STATUS),
      default: LATE_RETURN_CALL_STATUS.NOT_REQUIRED,
    },
    call_attempted_at: { type: Date },
    call_started_at: { type: Date },
    call_ended_at: { type: Date },
    call_session_id: { type: String, trim: true },
    call_transcript: { type: String, trim: true },
    call_summary: { type: String, trim: true },
    call_language: { type: String, trim: true },
    call_audio_mime_type: { type: String, trim: true },
    call_not_picked_reason: { type: String, trim: true },
  },

  applied_at: { type: Date, default: Date.now },
}, { timestamps: true });

// Indexes
gatepassSchema.index({ student_id: 1, applied_at: -1 });
gatepassSchema.index({ status: 1 });
gatepassSchema.index({ qr_token: 1 });
gatepassSchema.index({ qr_code_id: 1 });
gatepassSchema.index({ block_name: 1, status: 1 });
gatepassSchema.index({ expected_return: 1, status: 1 }); // for overdue cron

module.exports = mongoose.model('Gatepass', gatepassSchema);
