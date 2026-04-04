const mongoose = require('mongoose');

const messMenuSchema = new mongoose.Schema({
  block_name: { type: String, required: true },
  week_start: { type: Date, required: true }, // Monday of that week
  day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: true },
  meal: { type: String, enum: ['Breakfast', 'Lunch', 'Snacks', 'Dinner'], required: true },
  mess_type: { type: String, enum: ['Veg', 'Non-Veg', 'Special'], required: true },
  caterer: { type: String },
  menu_name: { type: String },
  items: [{
    name: String,
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
  }],
  nutrition: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    fiber: Number,
  },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
}, { timestamps: true });

messMenuSchema.index({ block_name: 1, day: 1, meal: 1, mess_type: 1 }, { unique: true });

const nightOrderSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  block_name: { type: String },
  room_no: { type: Number },
  order_no: { type: String, unique: true, required: true },
  items: [{
    item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'NightMessItem' },
    name: String,
    qty: Number,
    price: Number,
  }],
  subtotal_amount: { type: Number, default: 0 },
  total_amount: { type: Number, default: 0 },
  payment_status: { type: String, enum: ['Paid', 'Refunded', 'Partially Refunded', 'Fine Deducted'], default: 'Paid' },
  refund_amount: { type: Number, default: 0 },
  fine_amount: { type: Number, default: 0 },
  refund_reason: { type: String },
  note: { type: String },
  status: {
    type: String,
    enum: ['Confirmed', 'Preparing', 'Ready', 'Delivered', 'OutOfStock', 'NotReady', 'NotCollected', 'Refunded'],
    default: 'Confirmed',
  },
  ordered_at: { type: Date, default: Date.now },
  ready_at: { type: Date },
}, { timestamps: true });

const nightMessItemSchema = new mongoose.Schema({
  block_name: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  category: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },
  available_qty: { type: Number, default: 0, min: 0 },
  prep_time_mins: { type: Number, default: 10, min: 0 },
  is_available: { type: Boolean, default: true },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
}, { timestamps: true });

nightMessItemSchema.index({ block_name: 1, name: 1 }, { unique: true });

const messAttendanceSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  block_name: { type: String, required: true },
  date_key: { type: String, required: true },
  day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: true },
  meal: { type: String, enum: ['Breakfast', 'Lunch', 'Snacks', 'Dinner'], required: true },
  mess_type: { type: String, enum: ['Veg', 'Non-Veg', 'Special'] },
  status: { type: String, enum: ['Ate', 'Skipped'], required: true },
  recorded_at: { type: Date, default: Date.now },
}, { timestamps: true });

messAttendanceSchema.index({ student_id: 1, date_key: 1, meal: 1 }, { unique: true });
messAttendanceSchema.index({ block_name: 1, date_key: 1, meal: 1 });

const messFeedbackSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  block_name: { type: String, required: true },
  date_key: { type: String, required: true },
  day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: true },
  meal: { type: String, enum: ['Breakfast', 'Lunch', 'Snacks', 'Dinner'], required: true },
  mess_type: { type: String, enum: ['Veg', 'Non-Veg', 'Special'], required: true },
  menu_name: { type: String, trim: true },
  rating_taste: { type: Number, min: 1, max: 5, required: true },
  rating_quality: { type: Number, min: 1, max: 5, required: true },
  rating_quantity: { type: Number, min: 1, max: 5, required: true },
  rating_hygiene: { type: Number, min: 1, max: 5, required: true },
  rating_variety: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, trim: true, maxlength: 500 },
  is_anonymous: { type: Boolean, default: true },
}, { timestamps: true });

messFeedbackSchema.index({ student_id: 1, date_key: 1, meal: 1 }, { unique: true });
messFeedbackSchema.index({ block_name: 1, date_key: 1, meal: 1 });

const MessMenu = mongoose.model('MessMenu', messMenuSchema);
const NightOrder = mongoose.model('NightOrder', nightOrderSchema);
const NightMessItem = mongoose.model('NightMessItem', nightMessItemSchema);
const MessAttendance = mongoose.model('MessAttendance', messAttendanceSchema);
const MessFeedback = mongoose.model('MessFeedback', messFeedbackSchema);

module.exports = { MessMenu, NightOrder, NightMessItem, MessAttendance, MessFeedback };
