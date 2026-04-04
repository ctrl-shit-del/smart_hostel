const mongoose = require('mongoose');
const { COMPLAINT_CATEGORIES, COMPLAINT_STATUS, COMPLAINT_SEVERITY, SLA_HOURS } = require('../../../shared/constants');

const complaintSchema = new mongoose.Schema({
  raised_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  student_name: { type: String },
  register_number: { type: String },
  block_name: { type: String },
  floor_no: { type: Number },
  room_no: { type: Number },

  // Complaint details
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: { type: String, enum: Object.values(COMPLAINT_CATEGORIES), required: true },
  severity: { type: String, enum: Object.values(COMPLAINT_SEVERITY), default: COMPLAINT_SEVERITY.NORMAL },
  photos: [{ type: String }], // URLs

  // AI classification
  ai_category: { type: String },
  ai_confidence: { type: Number },
  ai_urgency_score: { type: Number },

  // Routing & assignment
  status: { type: String, enum: Object.values(COMPLAINT_STATUS), default: COMPLAINT_STATUS.OPEN },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  assigned_at: { type: Date },
  assigned_role: { type: String },

  // SLA
  sla_deadline: { type: Date },
  sla_breached: { type: Boolean, default: false },

  // Resolution
  resolution_note: { type: String },
  resolved_at: { type: Date },
  resolution_time_hrs: { type: Number },

  // Feedback
  rating: { type: Number, min: 1, max: 5 },
  feedback_note: { type: String },
  rated_at: { type: Date },

  // Escalation
  escalated: { type: Boolean, default: false },
  escalation_reason: { type: String },
  escalated_at: { type: Date },

  // Systemic flag (3+ same type on same floor)
  is_systemic: { type: Boolean, default: false },

  raised_at: { type: Date, default: Date.now },
}, { timestamps: true });

// Set SLA deadline on create
complaintSchema.pre('save', function () {
  if (this.isNew) {
    const hours = SLA_HOURS[this.severity] || 24;
    this.sla_deadline = new Date(Date.now() + hours * 60 * 60 * 1000);
  }
  if (this.status === COMPLAINT_STATUS.RESOLVED && !this.resolved_at) {
    this.resolved_at = new Date();
    this.resolution_time_hrs = (this.resolved_at - this.raised_at) / 3_600_000;
  }
});

// Indexes
complaintSchema.index({ raised_by: 1 });
complaintSchema.index({ block_name: 1, floor_no: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ raised_at: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
