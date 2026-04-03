const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../../../shared/constants');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  register_number: { type: String, unique: true, sparse: true, trim: true, uppercase: true },
  email: { type: String, sparse: true, lowercase: true, trim: true },
  password: { type: String, required: true },

  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.STUDENT,
  },

  // Hostel placement
  block_name: { type: String, trim: true },
  floor: { type: String }, // DB uses "Floor 1"
  room_no: { type: Number },
  bed_type: { type: String },
  bed: { type: String }, 

  // Profile
  phone: { type: String, trim: true },
  gender: { type: String },
  department: { type: String, trim: true },
  academic_year: { type: Number },
  profile_photo: { type: String },
  mess: { type: String }, // DB uses "mess"

  // Parent / Emergency
  parent_name: { type: String },
  parent_phone: { type: String },
  parent_email: { type: String },

  // Security
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

  created_at: { type: Date, default: Date.now },
  last_login: { type: Date },
}, { 
  timestamps: true,
  strict: false, // Let any other fields the user provided pass through
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals for compatibility with client
userSchema.virtual('floor_no').get(function() {
  if (typeof this.floor === 'string') {
    return parseInt(this.floor.replace(/\D/g, '')) || this.floor;
  }
  return this.floor;
});

userSchema.virtual('bed_id').get(function() {
  if (typeof this.bed === 'string') {
    return this.bed.split(' ').pop(); // e.g. "Bed C" -> "C"
  }
  return this.bed;
});

userSchema.virtual('mess_information').get(function() {
  return this.mess;
});

// Hash password before save (only if not already hashed and modified)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  if (!this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  // Match plaintext first (since user database has plaintext passwords)
  if (this.password === candidatePassword) return true;
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch(e) {
    return false;
  }
};

// Virtual: full hostel address
userSchema.virtual('hostel_address').get(function () {
  if (!this.block_name || !this.floor || !this.room_no) return null;
  return `${this.block_name}, Floor ${this.floor}, Room ${this.room_no}`;
});

// Indexes
userSchema.index({ register_number: 1 });

module.exports = mongoose.model('User', userSchema, 'students');
