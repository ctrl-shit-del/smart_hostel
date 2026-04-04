const mongoose = require('mongoose');
const { ATTENDANCE_METHOD, ATTENDANCE_STATUS } = require('../../../shared/constants');

const attendanceSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  student_name: { type: String },
  register_number: { type: String },
  block_name: { type: String },
  floor_no: { type: Number },
  room_no: { type: Number },

  date: { type: String, required: true }, // YYYY-MM-DD
  status: { type: String, enum: Object.values(ATTENDANCE_STATUS), default: ATTENDANCE_STATUS.ABSENT },
  method: { type: String, enum: Object.values(ATTENDANCE_METHOD) },

  // WiFi detection
  wifi_detected_at: { type: Date },
  device_mac: { type: String },

  // Face detection
  face_detected_at: { type: Date },
  client_ip: { type: String },

  // QR fallback
  qr_scanned_at: { type: Date },
  qr_code_id: { type: String },
  scan_location: {
    latitude: { type: Number },
    longitude: { type: Number },
  },

  // Manual override
  manual_marked_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  manual_reason: { type: String },

  // Cross-check with gatepass
  gatepass_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Gatepass' },

  // Anomaly
  consecutive_absences: { type: Number, default: 0 },
  flagged: { type: Boolean, default: false },
  alert_sent: { type: Boolean, default: false },

  created_at: { type: Date, default: Date.now },
}, { timestamps: true });

// Compound unique index: one record per student per day
attendanceSchema.index({ student_id: 1, date: 1 }, { unique: true });
attendanceSchema.index({ block_name: 1, floor_no: 1, date: 1 });
attendanceSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
