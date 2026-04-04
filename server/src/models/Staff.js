const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, unique: true, sparse: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  password: { type: String },
  role: { type: String },

  // Contact
  contactInfo: {
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
  },
  phone: { type: String, trim: true }, // For fallback/compatibility

  // Staff-specific
  staff_role: { type: String },
  shiftTimings: {
    start: { type: String },
    end: { type: String },
  },
  isCampuswide: { type: Boolean, default: false },
  shift_start: { type: String }, // For fallback
  shift_end: { type: String }, // For fallback
  assignedHostels: [{ type: String }],
  assigned_hostels: [{ type: String }], // For fallback
  isCampusWide: { type: Boolean, default: false },
  is_campus_wide: { type: Boolean, default: false }, // For fallback

  gender: { type: String },
  profile_photo: { type: String },

  // Flags
  is_active: { type: Boolean, default: true },
  last_login: { type: Date },
  sys_role: { type: String, default: 'housekeeping' }
}, {
  timestamps: true,
  strict: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals for compatibility with existing code
staffSchema.virtual('assigned_hostels_list').get(function() {
  return this.assignedHostels || this.assigned_hostels || [];
});

// Hash password before save
staffSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  if (!this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

// Compare password
staffSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  if (this.password === candidatePassword) return true;
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch(e) {
    return false;
  }
};

staffSchema.index({ username: 1 });
staffSchema.index({ email: 1 });
module.exports = mongoose.model('Staff', staffSchema, 'staff');
