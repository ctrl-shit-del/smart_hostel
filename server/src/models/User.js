const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../../../shared/constants');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  register_number: { type: String, unique: true, sparse: true, trim: true, uppercase: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },

  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.STUDENT,
    required: true,
  },

  // Hostel placement
  block_name: { type: String, trim: true },
  floor_no: { type: Number, min: 1, max: 15 },
  room_no: { type: Number },
  bed_id: { type: String, enum: ['A', 'B', 'C', 'D', 'E', 'F'] },

  // Profile
  phone: { type: String, trim: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  department: { type: String, trim: true },
  academic_year: { type: Number, min: 1, max: 5 },
  profile_photo: { type: String }, // URL
  mess_information: { type: String },
  bed_type: { type: String },

  // Parent / Emergency
  parent_name: { type: String },
  parent_phone: { type: String },
  parent_email: { type: String },

  // Security / AI
  device_mac: { type: String, trim: true },
  face_embeddings: [{ type: Number }],

  // Staff-specific
  staff_role: { type: String },
  shift_start: { type: String },
  shift_end: { type: String },
  assigned_hostels: [{ type: String }],
  is_campus_wide: { type: Boolean, default: false },

  // Flags
  is_active: { type: Boolean, default: true },
  is_flagged: { type: Boolean, default: false },
  flag_reason: { type: String },

  created_at: { type: Date, default: Date.now },
  last_login: { type: Date },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual: full hostel address
userSchema.virtual('hostel_address').get(function () {
  if (!this.block_name || !this.floor_no || !this.room_no) return null;
  return `${this.block_name}, Floor ${this.floor_no}, Room ${this.room_no}, Bed ${this.bed_id}`;
});

// Indexes
userSchema.index({ block_name: 1, floor_no: 1 });
userSchema.index({ register_number: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
