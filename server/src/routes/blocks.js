const express = require('express');
const router = express.Router();
const Block = require('../models/Block');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const blocks = await Block.find({ is_active: true });
  res.json({ success: true, blocks });
}));

router.get('/:name', authenticate, asyncHandler(async (req, res) => {
  const block = await Block.findOne({ block_name: req.params.name });
  if (!block) return res.status(404).json({ success: false, message: 'Block not found' });
  res.json({ success: true, block });
}));

router.post('/', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const block = await Block.create(req.body);
  res.status(201).json({ success: true, block });
}));

module.exports = router;
