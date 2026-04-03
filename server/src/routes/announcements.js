const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { authenticate } = require('../middleware/auth');
const { isFloorAdmin } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');
const { SOCKET_EVENTS } = require('../../../shared/constants');
const { emitToBlock, emitToAll } = require('../utils/socket');

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const now = new Date();
  const query = { is_active: true, $or: [{ expires_at: null }, { expires_at: { $gt: now } }] };
  if (req.user.block_name) {
    query.$and = [{ $or: [{ target_blocks: [] }, { target_blocks: { $size: 0 } }, { target_blocks: req.user.block_name }] }];
  }
  const announcements = await Announcement.find(query).sort({ createdAt: -1 }).limit(20);
  res.json({ success: true, count: announcements.length, announcements });
}));

router.post('/', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  const announcement = await Announcement.create({ ...req.body, created_by: req.user._id });
  if (announcement.target_blocks?.length > 0) {
    for (const block of announcement.target_blocks) emitToBlock(block, SOCKET_EVENTS.ALERT_NEW, announcement);
  } else {
    emitToAll(SOCKET_EVENTS.ALERT_NEW, announcement);
  }
  res.status(201).json({ success: true, announcement });
}));

router.delete('/:id', authenticate, isFloorAdmin, asyncHandler(async (req, res) => {
  await Announcement.findByIdAndUpdate(req.params.id, { is_active: false });
  res.json({ success: true, message: 'Announcement removed' });
}));

module.exports = router;
