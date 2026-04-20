const express = require('express');
const router  = express.Router();
const { Publisher } = require('../models/index');
const { protect, authorize } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    const publishers = await Publisher.find({
      $or: [{ isActive: true }, { isActive: { $exists: false } }]
    }).sort('name');
    res.json({ success: true, publishers });
  } catch (e) { next(e); }
});

router.post('/', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const publisher = await Publisher.create({ ...req.body, isActive: true });
    res.status(201).json({ success: true, publisher });
  } catch (e) { next(e); }
});

router.put('/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const publisher = await Publisher.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!publisher) return res.status(404).json({ success: false, message: 'Publisher not found' });
    res.json({ success: true, publisher });
  } catch (e) { next(e); }
});

router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    await Publisher.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Publisher deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
