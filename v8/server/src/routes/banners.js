const express = require('express');
const router  = express.Router();
const { Banner } = require('../models/index');
const { protect, authorize } = require('../middleware/auth');
const { deleteFromCloudinary } = require('../utils/cloudinary');

// GET active banners by placement (public)
router.get('/', async (req, res, next) => {
  try {
    const { placement } = req.query;
    const now   = new Date();
    const query = { isActive: true,
      $or: [{ startsAt: null }, { startsAt: { $lte: now } }],
      $and: [{ $or: [{ endsAt: null }, { endsAt: { $gte: now } }] }],
    };
    if (placement) query.placement = placement;
    const banners = await Banner.find(query).sort('order');
    res.json({ success: true, banners });
  } catch (e) { next(e); }
});

// Admin CRUD
router.get('/all',     protect, authorize('admin', 'manager'), async (req, res, next) => {
  try { res.json({ success: true, banners: await Banner.find().sort('-createdAt') }); } catch(e){next(e);}
});

router.post('/',  protect, authorize('admin', 'manager'), async (req, res, next) => {
  try { res.status(201).json({ success: true, banner: await Banner.create(req.body) }); } catch(e){next(e);}
});

router.put('/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!banner) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, banner });
  } catch(e){next(e);}
});

router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const b = await Banner.findByIdAndDelete(req.params.id);
    if (b?.imagePublicId) deleteFromCloudinary(b.imagePublicId, 'image').catch(()=>{});
    res.json({ success: true });
  } catch(e){next(e);}
});

// Track click
router.post('/:id/click', async (req, res, next) => {
  try {
    await Banner.findByIdAndUpdate(req.params.id, { $inc: { clickCount: 1 } });
    res.json({ success: true });
  } catch(e){next(e);}
});

module.exports = router;
