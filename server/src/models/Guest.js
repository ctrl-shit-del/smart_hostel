const mongoose = require('mongoose');
const { GUEST_STATUS } = require('../../../shared/constants');

const guestSchema = new mongoose.Schema({
  host_student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  host_register_number: { type: String },
  host_block: { type: String },
  host_room: { type: Number },

  guest_name: { type: String, required: true, trim: true },
  guest_phone: { type: String },
  relationship: { type: String, required: true }, // Parent, Sibling, Friend, etc.
  id_proof_url: { type: String }, // uploaded ID photo
  id_type: { type: String }, // Aadhar, PAN, etc.

  purpose: { type: String, trim: true },
  visit_date: { type: Date, required: true },
  authorized_areas: [{ type: String }],

  status: { type: String, enum: Object.values(GUEST_STATUS), default: GUEST_STATUS.PENDING },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approved_at: { type: Date },
  rejection_reason: { type: String },

  qr_token: { type: String, unique: true, sparse: true },
  entry_time: { type: Date },
  exit_time: { type: Date },
  entry_guard: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  is_overstayed: { type: Boolean, default: false },
  overstay_alert_sent: { type: Boolean, default: false },

  requested_at: { type: Date, default: Date.now },
}, { timestamps: true });

guestSchema.index({ host_student: 1 });
guestSchema.index({ status: 1 });
guestSchema.index({ qr_token: 1 });

module.exports = mongoose.model('Guest', guestSchema);
