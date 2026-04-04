const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  announcement_type: { type: String, enum: ['Notice', 'Poll'], default: 'Notice' },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  target_roles: [{ type: String }],     // [] = all
  target_blocks: [{ type: String }],    // [] = all blocks
  poll: {
    question: { type: String, trim: true },
    allow_multiple: { type: Boolean, default: false },
    options: [{
      label: { type: String, required: true, trim: true },
      votes: { type: Number, default: 0 },
      voters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    }],
  },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  expires_at: { type: Date },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

announcementSchema.index({ target_blocks: 1, is_active: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);
