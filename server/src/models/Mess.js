const mongoose = require('mongoose');

const messMenuSchema = new mongoose.Schema({
  block_name: { type: String, required: true },
  week_start: { type: Date, required: true }, // Monday of that week
  day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: true },
  meal: { type: String, enum: ['Breakfast', 'Lunch', 'Dinner', 'Night Mess'] },
  type: { type: String, enum: ['Veg', 'Non-Veg', 'Special', 'Both'] },
  caterer: { type: String },
  items: [{ name: String, calories: Number }],
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const nightOrderSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  block_name: { type: String },
  room_no: { type: Number },
  items: [{ name: String, qty: Number, price: Number }],
  total_amount: { type: Number },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Ready', 'Delivered'], default: 'Pending' },
  ordered_at: { type: Date, default: Date.now },
  ready_at: { type: Date },
}, { timestamps: true });

const MessMenu = mongoose.model('MessMenu', messMenuSchema);
const NightOrder = mongoose.model('NightOrder', nightOrderSchema);

module.exports = { MessMenu, NightOrder };
