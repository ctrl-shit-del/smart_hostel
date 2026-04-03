const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  register_number: { type: String, unique: true, required: true, trim: true, uppercase: true },
  email: { type: String, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, default: 'student' },

  // Hostel placement
  block_name: { type: String, trim: true },
  floor: { type: String }, 
  room_no: { type: Number },
  bed_type: { type: String },
  bed: { type: String }, 

  // Profile
  phone: { type: String, trim: true },
  gender: { type: String },
  department: { type: String, trim: true },
  academic_year: { type: Number },
  profile_photo: { type: String },
  mess: { type: String }, 

  // Parent / Emergency
  parent_name: { type: String },
  parent_phone: { type: String },
  parent_email: { type: String },

  // Security
  device_mac: { type: String, trim: true },
  face_embeddings: [{ type: Number }],
  dhobi_offence: { type: Number, default: 0 },

  // Community moderation
  community_strikes: { type: Number, default: 0, min: 0, max: 3 },
  community_banned: { type: Boolean, default: false },

  // Community moderation
  community_strikes: { type: Number, default: 0, min: 0, max: 3 },
  community_banned: { type: Boolean, default: false },

  // Flags
  is_active: { type: Boolean, default: true },
  is_flagged: { type: Boolean, default: false },
  is_campus_wide: { type: Boolean, default: false },
  outing_flag_count: { type: Number, default: 0, min: 0 },
  credentials_disabled_at: { type: Date },
  credentials_disabled_reason: { type: String, trim: true },

  created_at: { type: Date, default: Date.now },
  last_login: { type: Date },
}, { 
  timestamps: true,
  strict: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals for compatibility with client
studentSchema.virtual('floor_no').get(function() {
  if (typeof this.floor === 'string') {
    return parseInt(this.floor.replace(/\D/g, '')) || this.floor;
  }
  return this.floor;
});

studentSchema.virtual('bed_id').get(function() {
  if (typeof this.bed === 'string') {
    return this.bed.split(' ').pop();
  }
  return this.bed;
});

studentSchema.virtual('mess_information').get(function() {
  return this.mess;
});

studentSchema.virtual('hostel_address').get(function () {
  if (!this.block_name || !this.floor || !this.room_no) return null;
  return `${this.block_name}, Floor ${this.floor}, Room ${this.room_no}`;
});

// Hash password before save
studentSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  if (!this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

// Compare password
studentSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  if (this.password === candidatePassword) return true;
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch(e) {
    return false;
  }
};

studentSchema.index({ register_number: 1 });

module.exports = mongoose.model('Student', studentSchema, 'students');
