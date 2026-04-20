const express = require('express');
const router  = express.Router();
const { Category } = require('../models/index');
const { protect, authorize } = require('../middleware/auth');

// GET all active categories (isActive:true OR not set — handles existing data)
router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find({
      $or: [{ isActive: true }, { isActive: { $exists: false } }]
    }).sort('name');
    res.json({ success: true, categories });
  } catch (e) { next(e); }
});

router.post('/', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const category = await Category.create({ ...req.body, isActive: true });
    res.status(201).json({ success: true, category });
  } catch (e) { next(e); }
});

router.put('/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, category });
  } catch (e) { next(e); }
});

router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Category deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
