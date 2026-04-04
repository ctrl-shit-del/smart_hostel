const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
  block_name: { type: String, required: true, unique: true, trim: true },
  full_name: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Mixed'], required: true },
  total_floors: { type: Number, required: true },
  rooms_per_floor: { type: Number, required: true },
  total_rooms: { type: Number, required: true },
  available_bed_types: [{ type: String }],
  facilities: [{ type: String }],
  mess_caterers: [{ type: String }],
  warden_in_charge: { type: String },
  wifi_ip: { type: String },                          // block's expected WiFi IP (for reference / future enforcement)
  attendance_window_open: { type: Boolean, default: false },
  attendance_window_opened_at: { type: Date },
  attendance_window_closed_at: { type: Date },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Block', blockSchema);
