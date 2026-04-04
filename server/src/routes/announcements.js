const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { authenticate } = require('../middleware/auth');
const { isFloorAdmin, isStudent } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');
const { SOCKET_EVENTS } = require('../../../shared/constants');
const { emitToBlock, emitToAll } = require('../utils/socket');

const buildAudienceQuery = (user) => {
  const now = new Date();
  const query = { is_active: true, $or: [{ expires_at: null }, { expires_at: { $gt: now } }] };
  const targetClauses = [{ target_blocks: [] }, { target_blocks: { $size: 0 } }];
  if (user.block_name) targetClauses.push({ target_blocks: user.block_name });
  query.$and = [{ $or: targetClauses }];
  return query;
};

const sanitizeAnnouncement = (announcement, currentUserId) => {
  const doc = typeof announcement.toObject === 'function' ? announcement.toObject() : announcement;
  if (doc.poll?.options?.length) {
    doc.poll.options = doc.poll.options.map((option) => ({
      label: option.label,
      votes: option.votes || 0,
      hasVoted: currentUserId ? option.voters?.some((voterId) => String(voterId) === String(currentUserId)) : false,
    }));
    doc.poll.totalVotes = doc.poll.options.reduce((sum, option) => sum + (option.votes || 0), 0);
    doc.poll.userVote = doc.poll.options.find((option) => option.hasVoted)?.label || null;
  }
  return doc;
};

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const announcements = await Announcement.find(buildAudienceQuery(req.user)).sort({ createdAt: -1 }).limit(20);
  res.json({
    success: true,
    count: announcements.length,
    announcements: announcements.map((announcement) => sanitizeAnnouncement(announcement, req.user._id)),
  });
}));

router.post('/', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const payload = { ...req.body, created_by: req.user._id };

  if (payload.announcement_type === 'Poll') {
    const options = (payload.poll?.options || [])
      .map((option) => option?.label?.trim())
      .filter(Boolean)
      .slice(0, 8);

    if (!payload.poll?.question?.trim() || options.length < 2) {
      return res.status(400).json({ success: false, message: 'Polls need a question and at least 2 options.' });
    }

    payload.poll = {
      question: payload.poll.question.trim(),
      allow_multiple: false,
      options: options.map((label) => ({ label, votes: 0, voters: [] })),
    };
  } else {
    payload.poll = undefined;
  }

  const announcement = await Announcement.create(payload);
  const outbound = sanitizeAnnouncement(announcement, null);

  if (announcement.target_blocks?.length > 0) {
    for (const block of announcement.target_blocks) emitToBlock(block, SOCKET_EVENTS.ALERT_NEW, outbound);
  } else {
    emitToAll(SOCKET_EVENTS.ALERT_NEW, outbound);
  }

  res.status(201).json({ success: true, announcement: outbound });
}));

router.post('/:id/vote', authenticate, isStudent, asyncHandler(async (req, res) => {
  const { optionLabel } = req.body;
  const announcement = await Announcement.findById(req.params.id);

  if (!announcement || !announcement.is_active || announcement.announcement_type !== 'Poll') {
    return res.status(404).json({ success: false, message: 'Poll not found.' });
  }

  const selectedOption = announcement.poll?.options?.find((option) => option.label === optionLabel);
  if (!selectedOption) {
    return res.status(400).json({ success: false, message: 'Invalid poll option selected.' });
  }

  announcement.poll.options.forEach((option) => {
    option.voters = (option.voters || []).filter((voterId) => String(voterId) !== String(req.user._id));
    option.votes = option.voters.length;
  });

  selectedOption.voters.push(req.user._id);
  selectedOption.votes = selectedOption.voters.length;

  await announcement.save();
  res.json({ success: true, announcement: sanitizeAnnouncement(announcement, req.user._id) });
}));

router.delete('/:id', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  await Announcement.findByIdAndUpdate(req.params.id, { is_active: false });
  res.json({ success: true, message: 'Announcement removed' });
}));

module.exports = router;
