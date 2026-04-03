const mongoose = require('mongoose');
const { HEALTH_SEVERITY } = require('../../../shared/constants');

const healthEventSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  student_name: { type: String },
  register_number: { type: String },
  block_name: { type: String },
  floor_no: { type: Number },
  room_no: { type: Number },
  phone: { type: String },
  parent_phone: { type: String },

  severity: { type: String, enum: Object.values(HEALTH_SEVERITY), required: true },
  description: { type: String, trim: true },
  symptoms: [{ type: String }],

  // Response tracking
  reported_at: { type: Date, default: Date.now },
  warden_notified_at: { type: Date },
  health_center_notified_at: { type: Date },
  ambulance_called_at: { type: Date },
  response_time_seconds: { type: Number },

  // Resolution
  resolved: { type: Boolean, default: false },
  resolved_at: { type: Date },
  resolution_note: { type: String },
  resolved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Alerts sent to
  alerts_sent_to: [{
    name: String,
    phone: String,
    relation: String,
    sent_at: Date,
  }],
}, { timestamps: true });

healthEventSchema.index({ student_id: 1 });
healthEventSchema.index({ block_name: 1, reported_at: -1 });
healthEventSchema.index({ resolved: 1 });

module.exports = mongoose.model('HealthEvent', healthEventSchema);
