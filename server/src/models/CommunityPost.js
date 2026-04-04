const mongoose = require('mongoose');

const COMMUNITY_CATEGORIES = ['General', 'Lost & Found', 'Book Exchange', 'Events', 'Questions', 'Memes', 'Rant', 'Hostel Feedback'];
const POST_STATUS = ['active', 'hidden', 'removed'];

const replySchema = new mongoose.Schema({
  author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pseudonym: { type: String, required: true },
  avatar_color: { type: String, required: true },
  content: { type: String, required: true, maxlength: 1000 },
  original_content: { type: String }, // stored before censoring
  toxicity_score: { type: Number, default: 0, min: 0, max: 1 },
  flagged: { type: Boolean, default: false },
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  created_at: { type: Date, default: Date.now },
});

const communityPostSchema = new mongoose.Schema({
  author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pseudonym: { type: String, required: true },
  avatar_color: { type: String, required: true },
  
  // Content
  title: { type: String, required: true, trim: true, maxlength: 200 },
  content: { type: String, required: true, trim: true, maxlength: 3000 },
  original_content: { type: String }, // stored before any censoring
  category: { type: String, enum: COMMUNITY_CATEGORIES, default: 'General' },
  tags: [{ type: String, maxlength: 30 }],
  
  // AI moderation
  toxicity_score: { type: Number, default: 0, min: 0, max: 1 },
  flagged: { type: Boolean, default: false },
  flag_reason: { type: String },
  
  // Engagement
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  views: { type: Number, default: 0 },
  replies: [replySchema],
  
  // Status
  status: { type: String, enum: POST_STATUS, default: 'active' },
  removed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  removed_reason: { type: String },
  
  // Hostel context
  block_name: { type: String },
  
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, { timestamps: true });

// Virtuals
communityPostSchema.virtual('score').get(function () {
  return (this.upvotes?.length || 0) - (this.downvotes?.length || 0);
});

communityPostSchema.virtual('reply_count').get(function () {
  return this.replies?.length || 0;
});

// Ensure virtuals are serialized
communityPostSchema.set('toJSON', { virtuals: true });
communityPostSchema.set('toObject', { virtuals: true });

// Indexes
communityPostSchema.index({ created_at: -1 });
communityPostSchema.index({ category: 1 });
communityPostSchema.index({ status: 1 });
communityPostSchema.index({ author_id: 1 });
communityPostSchema.index({ block_name: 1 });
communityPostSchema.index({ toxicity_score: -1 });

module.exports = mongoose.model('CommunityPost', communityPostSchema);
module.exports.COMMUNITY_CATEGORIES = COMMUNITY_CATEGORIES;
module.exports.POST_STATUS = POST_STATUS;
