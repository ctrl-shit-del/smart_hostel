const mongoose = require('mongoose');
const { LAUNDRY_STATUS } = require('../../../shared/constants');

const laundrySessionSchema = new mongoose.Schema({
  session_id: { type: String, required: true, unique: true },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  register_number: { type: String, required: true },
  room_no: { type: Number, required: true },
  block_name: { type: String },
  floor_no: { type: Number },
  status: { type: String, enum: Object.values(LAUNDRY_STATUS), default: LAUNDRY_STATUS.PROCESSING },
  entry_timestamp: { type: Date, default: Date.now },
  exit_timestamp: { type: Date },
}, { timestamps: true });

laundrySessionSchema.index({ student_id: 1, status: 1 });

module.exports = mongoose.model('LaundrySession', laundrySessionSchema);
