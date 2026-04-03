const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactInfo: {
    phone: { type: String },
    email: { type: String },
  },
  role: { type: String },
  assignedHostels: [{ type: String }],
  shiftTimings: {
    start: { type: String },
    end: { type: String },
  },
  isCampuswide: { type: Boolean, default: false },
  gender: { type: String },

  // Login credentials
  username: { type: String, unique: true, sparse: true },
  password: { type: String },

  // System
  sys_role: { type: String, default: 'housekeeping' }
}, {
  timestamps: true,
  strict: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compare password
staffSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  // Match plaintext first if not hashed yet
  if (this.password === candidatePassword) return true;
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch(e) {
    return false;
  }
};

module.exports = mongoose.model('Staff', staffSchema, 'staff');
