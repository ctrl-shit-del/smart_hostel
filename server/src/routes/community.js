const express = require('express');
const router = express.Router();
const CommunityPost = require('../models/CommunityPost');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const { authenticate } = require('../middleware/auth');
const { isFloorAdmin } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

// ─── Profanity / Toxicity helpers ─────────────────────────────────────────────
const PROFANITY_LIST = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap', 'dick', 'bastard',
  'hell', 'slut', 'whore', 'idiot', 'stupid', 'dumb', 'moron',
  'retard', 'nigger', 'faggot', 'cunt', 'piss', 'cock', 'porn',
  'kill', 'die', 'hate', 'loser', 'trash', 'suck', 'wtf', 'stfu',
];

const TOXICITY_KEYWORDS = {
  high: ['kill', 'die', 'suicide', 'threat', 'bomb', 'attack', 'murder', 'weapon', 'violent', 'rape'],
  medium: ['hate', 'stupid', 'idiot', 'loser', 'trash', 'ugly', 'disgusting', 'pathetic', 'worthless'],
  low: ['damn', 'crap', 'hell', 'suck', 'wtf', 'bs', 'smh', 'lame'],
};

function censorText(text) {
  let censored = text;
  for (const word of PROFANITY_LIST) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    censored = censored.replace(regex, '*'.repeat(word.length));
  }
  return censored;
}

function calculateToxicity(text) {
  const lower = text.toLowerCase();
  let score = 0;
  const reasons = [];

  for (const word of TOXICITY_KEYWORDS.high) {
    if (lower.includes(word)) { score += 0.35; reasons.push(word); }
  }
  for (const word of TOXICITY_KEYWORDS.medium) {
    if (lower.includes(word)) { score += 0.15; reasons.push(word); }
  }
  for (const word of TOXICITY_KEYWORDS.low) {
    if (lower.includes(word)) { score += 0.05; reasons.push(word); }
  }

  // ALL CAPS penalty
  const capsRatio = (text.match(/[A-Z]/g) || []).length / Math.max(text.length, 1);
  if (capsRatio > 0.6 && text.length > 10) score += 0.1;

  // Excessive punctuation penalty
  if (/[!?]{3,}/.test(text)) score += 0.05;

  return { score: Math.min(score, 1.0), reasons };
}

// ─── Pseudonym generator ──────────────────────────────────────────────────────
const ADJECTIVES = [
  'Anonymous', 'Mysterious', 'Curious', 'Silent', 'Brave', 'Clever', 'Bold',
  'Swift', 'Cosmic', 'Lunar', 'Solar', 'Neon', 'Pixel', 'Quantum', 'Cyber',
  'Shadow', 'Crystal', 'Thunder', 'Frost', 'Storm', 'Velvet', 'Ember',
  'Crimson', 'Azure', 'Jade', 'Golden', 'Silver', 'Iron', 'Cobalt', 'Sage',
];
const NOUNS = [
  'Panda', 'Phoenix', 'Dragon', 'Wolf', 'Owl', 'Fox', 'Hawk', 'Tiger',
  'Bear', 'Eagle', 'Lion', 'Falcon', 'Raven', 'Sphinx', 'Griffin', 'Serpent',
  'Raccoon', 'Dolphin', 'Shark', 'Panther', 'Cobra', 'Lynx', 'Jaguar', 'Orca',
  'Mantis', 'Coyote', 'Bison', 'Crane', 'Viper', 'Moth',
];
const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#f97316', '#14b8a6', '#a855f7', '#3b82f6', '#84cc16',
];

const pseudonymCache = new Map();

function getPseudonym(userId) {
  const key = userId.toString();
  if (pseudonymCache.has(key)) return pseudonymCache.get(key);

  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0;
  }
  const adj = ADJECTIVES[Math.abs(hash) % ADJECTIVES.length];
  const noun = NOUNS[Math.abs(hash >> 8) % NOUNS.length];
  const num = Math.abs(hash % 100);
  const color = AVATAR_COLORS[Math.abs(hash >> 4) % AVATAR_COLORS.length];
  const pseudonym = { name: `${adj}${noun}${num}`, color };
  pseudonymCache.set(key, pseudonym);
  return pseudonym;
}

// ─── DB-backed strike helpers ─────────────────────────────────────────────────
async function getUserModState(userId) {
  let user = await Student.findById(userId).select('community_strikes community_banned');
  if (!user) user = await Staff.findById(userId).select('community_strikes community_banned');
  return { strikes: user?.community_strikes || 0, banned: user?.community_banned || false };
}

async function addStrikeToUser(userId) {
  let user = await Student.findById(userId).select('community_strikes community_banned');
  if (!user) user = await Staff.findById(userId).select('community_strikes community_banned');
  
  if (!user) return { strikes: 0, banned: false };

  user.community_strikes = Math.min((user.community_strikes || 0) + 1, 3);
  if (user.community_strikes >= 3) user.community_banned = true;
  await user.save();
  return { strikes: user.community_strikes, banned: user.community_banned };
}

// ─── Helpers for vote serialization ──────────────────────────────────────────
function serializePost(post, currentUserId) {
  const pj = post.toJSON ? post.toJSON() : { ...post };
  const score = (pj.upvotes?.length || 0) - (pj.downvotes?.length || 0);
  const ageHours = (Date.now() - new Date(pj.created_at).getTime()) / 3600000;
  pj.hot_score = score / Math.pow(ageHours + 2, 1.5);
  pj.vote_score = score;
  pj.upvote_count = pj.upvotes?.length || 0;
  pj.downvote_count = pj.downvotes?.length || 0;
  pj.user_vote = pj.upvotes?.some(id => id.toString() === currentUserId.toString()) ? 'up'
    : pj.downvotes?.some(id => id.toString() === currentUserId.toString()) ? 'down' : null;
  delete pj.upvotes;
  delete pj.downvotes;
  pj.replies = (pj.replies || []).map(r => ({
    ...r,
    upvote_count: r.upvotes?.length || 0,
    downvote_count: r.downvotes?.length || 0,
    user_vote: r.upvotes?.some(id => id.toString() === currentUserId.toString()) ? 'up'
      : r.downvotes?.some(id => id.toString() === currentUserId.toString()) ? 'down' : null,
    upvotes: undefined,
    downvotes: undefined,
  }));
  return pj;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATIC ROUTES — must be declared BEFORE /:id to avoid conflict
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/v1/community/my/strikes — check own moderation state
router.get('/my/strikes', authenticate, asyncHandler(async (req, res) => {
  const { strikes, banned } = await getUserModState(req.user._id);
  res.json({ success: true, strikes, banned, max_strikes: 3 });
}));

// GET /api/v1/community/trending — trending topics / tag cloud
router.get('/trending', authenticate, asyncHandler(async (req, res) => {
  const [tagCloud, topCategories, topPosts] = await Promise.all([
    // Tag frequency in the last 7 days
    CommunityPost.aggregate([
      { $match: { status: 'active', created_at: { $gte: new Date(Date.now() - 7 * 86400000) } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
    // Category activity last 24h
    CommunityPost.aggregate([
      { $match: { status: 'active', created_at: { $gte: new Date(Date.now() - 86400000) } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    // Hot posts (top 5 by score last 24h)
    CommunityPost.find({ status: 'active', created_at: { $gte: new Date(Date.now() - 86400000) } })
      .sort({ created_at: -1 })
      .limit(50)
      .select('title category upvotes downvotes views created_at pseudonym avatar_color'),
  ]);

  // Sort top posts by hot score client-style
  const scored = topPosts.map(p => {
    const score = (p.upvotes?.length || 0) - (p.downvotes?.length || 0);
    const ageHrs = (Date.now() - new Date(p.created_at).getTime()) / 3600000;
    return { ...p.toJSON(), hot_score: score / Math.pow(ageHrs + 2, 1.5), vote_score: score };
  }).sort((a, b) => b.hot_score - a.hot_score).slice(0, 5);

  res.json({ success: true, tag_cloud: tagCloud, hot_categories: topCategories, hot_posts: scored });
}));

// GET /api/v1/community/admin/flagged
router.get('/admin/flagged', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const posts = await CommunityPost.find({ flagged: true, status: 'active' })
    .sort({ toxicity_score: -1, created_at: -1 })
    .limit(50);

  const populated = await Promise.all(posts.map(async p => {
    let author;
    if (p.author_type === 'Student') {
      author = await Student.findById(p.author_id).select('name register_number block_name floor_no room_no community_strikes community_banned');
    } else {
      author = await Staff.findById(p.author_id).select('name username block_name community_strikes community_banned');
    }
    const pj = p.toJSON();
    pj.author_id = author;
    return pj;
  }));

  res.json({ success: true, posts: populated });
}));

// GET /api/v1/community/admin/sentiment
router.get('/admin/sentiment', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const [categoryBreakdown, toxicityAvg, topPosts, totalPosts, flaggedCount, bannedUsers, trendByDay] = await Promise.all([
    CommunityPost.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    CommunityPost.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, avg_toxicity: { $avg: '$toxicity_score' }, max_toxicity: { $max: '$toxicity_score' } } },
    ]),
    CommunityPost.find({ status: 'active' })
      .sort({ created_at: -1 })
      .limit(5)
      .select('title category toxicity_score flagged created_at pseudonym avatar_color'),
    CommunityPost.countDocuments({ status: 'active' }),
    CommunityPost.countDocuments({ flagged: true, status: 'active' }),
    (async () => {
      const s = await Student.countDocuments({ community_banned: true });
      const t = await Staff.countDocuments({ community_banned: true });
      return s + t;
    })(),
    // Posts per day last 7 days
    CommunityPost.aggregate([
      { $match: { status: 'active', created_at: { $gte: new Date(Date.now() - 7 * 86400000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } }, count: { $sum: 1 }, avg_tox: { $avg: '$toxicity_score' } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const avgTox = toxicityAvg[0]?.avg_toxicity || 0;
  const moodIndex = Math.round((1 - avgTox) * 100);

  res.json({
    success: true,
    sentiment: {
      mood_index: moodIndex,
      avg_toxicity: avgTox,
      max_toxicity: toxicityAvg[0]?.max_toxicity || 0,
      total_posts: totalPosts,
      flagged_count: flaggedCount,
      banned_users: bannedUsers,
      category_breakdown: categoryBreakdown,
      recent_posts: topPosts,
      trend_by_day: trendByDay,
    },
  });
}));

// GET /api/v1/community/admin/banned-users — list banned users
router.get('/admin/banned-users', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const [students, staff] = await Promise.all([
    Student.find({ community_banned: true }).select('name register_number block_name floor_no room_no community_strikes community_banned createdAt'),
    Staff.find({ community_banned: true }).select('name username block_name community_strikes community_banned createdAt')
  ]);
  res.json({ success: true, users: [...students, ...staff] });
}));

// POST /api/v1/community/admin/:id/remove — admin remove post + strike
router.post('/admin/:id/remove', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const post = await CommunityPost.findById(req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

  post.status = 'removed';
  post.removed_by = req.user._id;
  post.removed_by_type = req.user.role === 'student' ? 'Student' : 'Staff';
  post.removed_reason = reason || 'Removed by admin';
  await post.save();

  const { strikes, banned } = await addStrikeToUser(post.author_id);

  res.json({
    success: true,
    message: `Post removed. Author now has ${strikes}/3 strikes.${banned ? ' Author is now BANNED.' : ''}`,
    strikes, banned,
  });
}));

// POST /api/v1/community/admin/:userId/unban — lift a ban
router.post('/admin/:userId/unban', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  let user = await Student.findById(req.params.userId).select('name community_strikes community_banned');
  if (!user) user = await Staff.findById(req.params.userId).select('name community_strikes community_banned');
  
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  user.community_banned = false;
  user.community_strikes = 0;
  await user.save();

  res.json({ success: true, message: `${user.name} has been unbanned and strikes reset.` });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// DYNAMIC ROUTES — /:id must come AFTER all static routes
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/v1/community — list posts
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { category, sort = 'hot', page = 1, limit = 20, search } = req.query;
  const query = { status: 'active' };

  if (category && category !== 'All') query.category = category;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } },
    ];
  }

  let sortObj = {};
  if (sort === 'new') sortObj = { created_at: -1 };
  else sortObj = { created_at: -1 }; // hot and top re-sorted in memory

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [posts, total] = await Promise.all([
    CommunityPost.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-original_content -author_id'),
    CommunityPost.countDocuments(query),
  ]);

  const postsJson = posts.map(p => serializePost(p, req.user._id));

  if (sort === 'hot') postsJson.sort((a, b) => b.hot_score - a.hot_score);
  else if (sort === 'top') postsJson.sort((a, b) => b.vote_score - a.vote_score);

  res.json({
    success: true,
    total,
    page: parseInt(page),
    posts: postsJson,
    categories: CommunityPost.COMMUNITY_CATEGORIES,
  });
}));

// POST /api/v1/community — create post
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { strikes, banned } = await getUserModState(req.user._id);

  if (banned) {
    return res.status(403).json({
      success: false,
      message: '🚫 You have been banned from the community due to repeated violations (3 strikes). Contact warden to appeal.',
      banned: true, strikes: 3,
    });
  }

  const { title, content, category, tags } = req.body;
  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({ success: false, message: 'Title and content are required' });
  }

  const titleTox = calculateToxicity(title);
  const contentTox = calculateToxicity(content);
  const totalScore = Math.max(titleTox.score, contentTox.score);
  const allReasons = [...new Set([...titleTox.reasons, ...contentTox.reasons])];

  const censoredTitle = censorText(title);
  const censoredContent = censorText(content);

  if (totalScore > 0.7) {
    const { strikes: newStrikes, banned: nowBanned } = await addStrikeToUser(req.user._id);
    return res.status(400).json({
      success: false,
      message: `⚠️ Your post was rejected due to highly toxic content. Strike ${newStrikes}/3.${nowBanned ? ' You are now BANNED from the community.' : ''}`,
      toxicity_score: totalScore,
      strikes: newStrikes,
      banned: nowBanned,
    });
  }

  const flagged = totalScore > 0.3;
  let currentStrikes = strikes;
  if (flagged && totalScore > 0.5) {
    const result = await addStrikeToUser(req.user._id);
    currentStrikes = result.strikes;
  }

  const pseudonym = getPseudonym(req.user._id);

  const post = await CommunityPost.create({
    author_id: req.user._id,
    author_type: req.user.role === 'student' ? 'Student' : 'Staff',
    pseudonym: pseudonym.name,
    avatar_color: pseudonym.color,
    title: censoredTitle,
    content: censoredContent,
    original_content: content !== censoredContent ? content : undefined,
    category: category || 'General',
    tags: tags || [],
    toxicity_score: totalScore,
    flagged,
    flag_reason: flagged ? `Detected: ${allReasons.join(', ')}` : undefined,
    block_name: req.user.block_name,
  });

  const postJson = post.toJSON();
  delete postJson.author_id;
  delete postJson.original_content;
  postJson.upvote_count = 0;
  postJson.downvote_count = 0;
  postJson.vote_score = 0;
  postJson.user_vote = null;

  res.status(201).json({
    success: true,
    message: flagged ? '⚠️ Your post is live but has been flagged for review.' : 'Post published! 🎉',
    post: postJson,
    flagged,
    toxicity_score: totalScore,
    strikes: currentStrikes,
    banned: currentStrikes >= 3,
  });
}));

// GET /api/v1/community/:id — single post
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const post = await CommunityPost.findById(req.params.id).select('-original_content -author_id');
  if (!post || post.status !== 'active') {
    return res.status(404).json({ success: false, message: 'Post not found' });
  }

  post.views += 1;
  await post.save();

  const pj = serializePost(post, req.user._id);
  res.json({ success: true, post: pj });
}));

// POST /api/v1/community/:id/vote
router.post('/:id/vote', authenticate, asyncHandler(async (req, res) => {
  const { vote } = req.body;
  const post = await CommunityPost.findById(req.params.id);
  if (!post || post.status !== 'active') {
    return res.status(404).json({ success: false, message: 'Post not found' });
  }

  const userId = req.user._id;
  post.upvotes = post.upvotes.filter(id => id.toString() !== userId.toString());
  post.downvotes = post.downvotes.filter(id => id.toString() !== userId.toString());

  if (vote === 'up') post.upvotes.push(userId);
  else if (vote === 'down') post.downvotes.push(userId);

  await post.save();

  res.json({
    success: true,
    upvote_count: post.upvotes.length,
    downvote_count: post.downvotes.length,
    vote_score: post.upvotes.length - post.downvotes.length,
    user_vote: vote === 'none' ? null : vote,
  });
}));

// POST /api/v1/community/:id/reply
router.post('/:id/reply', authenticate, asyncHandler(async (req, res) => {
  const { strikes, banned } = await getUserModState(req.user._id);
  if (banned) {
    return res.status(403).json({ success: false, message: '🚫 You are banned from the community.', banned: true });
  }

  const { content } = req.body;
  if (!content?.trim()) {
    return res.status(400).json({ success: false, message: 'Reply content is required' });
  }

  const post = await CommunityPost.findById(req.params.id);
  if (!post || post.status !== 'active') {
    return res.status(404).json({ success: false, message: 'Post not found' });
  }

  const { score, reasons } = calculateToxicity(content);

  if (score > 0.7) {
    const { strikes: newStrikes } = await addStrikeToUser(req.user._id);
    return res.status(400).json({
      success: false,
      message: `⚠️ Reply rejected — toxic content detected. Strike ${newStrikes}/3.`,
      strikes: newStrikes,
    });
  }

  const flagged = score > 0.3;
  if (flagged && score > 0.5) await addStrikeToUser(req.user._id);

  const pseudonym = getPseudonym(req.user._id);
  const censoredContent = censorText(content);

  post.replies.push({
    author_id: req.user._id,
    author_type: req.user.role === 'student' ? 'Student' : 'Staff',
    pseudonym: pseudonym.name,
    avatar_color: pseudonym.color,
    content: censoredContent,
    original_content: content !== censoredContent ? content : undefined,
    toxicity_score: score,
    flagged,
  });

  await post.save();

  const reply = post.replies[post.replies.length - 1].toJSON();
  delete reply.author_id;
  delete reply.original_content;
  reply.upvote_count = 0;
  reply.downvote_count = 0;
  reply.user_vote = null;

  res.status(201).json({
    success: true,
    message: flagged ? '⚠️ Reply posted but flagged for review.' : 'Reply posted!',
    reply,
    flagged,
  });
}));

// POST /api/v1/community/:postId/reply/:replyId/vote
router.post('/:postId/reply/:replyId/vote', authenticate, asyncHandler(async (req, res) => {
  const { vote } = req.body;
  const post = await CommunityPost.findById(req.params.postId);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

  const reply = post.replies.id(req.params.replyId);
  if (!reply) return res.status(404).json({ success: false, message: 'Reply not found' });

  const userId = req.user._id;
  reply.upvotes = reply.upvotes.filter(id => id.toString() !== userId.toString());
  reply.downvotes = reply.downvotes.filter(id => id.toString() !== userId.toString());

  if (vote === 'up') reply.upvotes.push(userId);
  else if (vote === 'down') reply.downvotes.push(userId);

  await post.save();

  res.json({
    success: true,
    upvote_count: reply.upvotes.length,
    downvote_count: reply.downvotes.length,
    vote_score: reply.upvotes.length - reply.downvotes.length,
    user_vote: vote === 'none' ? null : vote,
  });
}));

// DELETE /api/v1/community/:id
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const post = await CommunityPost.findById(req.params.id);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

  if (post.author_id.toString() !== req.user._id.toString() &&
      !['hostel_admin', 'warden'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  post.status = 'removed';
  post.removed_by = req.user._id;
  post.removed_reason = req.user.role !== 'student' ? 'Removed by admin' : 'Deleted by author';
  await post.save();

  res.json({ success: true, message: 'Post removed' });
}));

module.exports = router;
