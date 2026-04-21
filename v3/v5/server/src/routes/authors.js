const express = require('express');
const router  = express.Router();
const { Author } = require('../models/index');
const { protect, authorize } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    const query = search ? { name: { $regex: search, $options: 'i' } } : {
      $or: [{ isActive: true }, { isActive: { $exists: false } }]
    };
    const authors = await Author.find(query).sort('name');
    res.json({ success: true, authors });
  } catch (e) { next(e); }
});

router.post('/', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const author = await Author.create({ ...req.body, isActive: true });
    res.status(201).json({ success: true, author });
  } catch (e) { next(e); }
});

router.put('/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const author = await Author.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!author) return res.status(404).json({ success: false, message: 'Author not found' });
    res.json({ success: true, author });
  } catch (e) { next(e); }
});

router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    await Author.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Author deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
