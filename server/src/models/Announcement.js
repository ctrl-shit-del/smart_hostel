const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  target_roles: [{ type: String }],     // [] = all
  target_blocks: [{ type: String }],    // [] = all blocks
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  expires_at: { type: Date },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

announcementSchema.index({ target_blocks: 1, is_active: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);
