const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  role: { type: String, enum: ['user', 'bot'], required: true },
  content: { type: String, required: true, maxlength: 2000 },
  intent: { type: String }, // detected intent: mess_menu, laundry, gatepass, complaint, room, policy, greeting, etc.
  context: { type: mongoose.Schema.Types.Mixed }, // any data returned by bot
  flagged: { type: Boolean, default: false },
  toxicity_score: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
});

const chatSessionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  messages: [chatMessageSchema],
  is_active: { type: Boolean, default: true },
  escalated: { type: Boolean, default: false },
  escalation_reason: { type: String },
  started_at: { type: Date, default: Date.now },
  ended_at: { type: Date },
}, { timestamps: true });

// Indexes
chatSessionSchema.index({ user_id: 1, is_active: 1 });
chatSessionSchema.index({ started_at: -1 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
