const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, unique: true, sparse: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  password: { type: String },
  role: { type: String },

  contactInfo: {
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
  },
  phone: { type: String, trim: true },
  staff_role: { type: String },
  shiftTimings: {
    start: { type: String },
    end: { type: String },
  },
  isCampuswide: { type: Boolean, default: false },
  shift_start: { type: String },
  shift_end: { type: String },
  assignedHostels: [{ type: String }],
  assigned_hostels: [{ type: String }],
  isCampusWide: { type: Boolean, default: false },
  is_campus_wide: { type: Boolean, default: false },
  gender: { type: String },
  profile_photo: { type: String },
  is_active: { type: Boolean, default: true },
  last_login: { type: Date },
  sys_role: { type: String, default: undefined }
}, {
  timestamps: true,
  strict: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

staffSchema.virtual('assigned_hostels_list').get(function() {
  return this.assignedHostels || this.assigned_hostels || [];
});

const ROLE_MAP = {
  warden: 'warden',
  proctor: 'proctor',
  guard: 'guard',
  security: 'guard',
  'security incharge': 'security_incharge',
  'security-incharge': 'security_incharge',
  security_incharge: 'security_incharge',
  housekeeping: 'housekeeping',
  dhobi: 'housekeeping',
  laundry: 'housekeeping',
  technician: 'technician',
  'hostel admin': 'hostel_admin',
  admin: 'hostel_admin',
  'floor admin': 'floor_admin',
  'mess incharge': 'mess_incharge',
  'mess in-charge': 'mess_incharge',
  faculty: 'floor_admin',
};

staffSchema.virtual('effectiveRole').get(function () {
  if (this.sys_role) return this.sys_role.toLowerCase();
  if (this.role) return ROLE_MAP[this.role.toLowerCase()] || 'housekeeping';
  return 'housekeeping';
});

staffSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  if (!this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

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
