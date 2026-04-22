const express = require('express');
const router = express.Router();
const { MembershipPlan } = require('../models/index');
const { protect, authorize } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    const plans = await MembershipPlan.find({ isActive: true }).sort('price');
    res.json({ success: true, plans });
  } catch (e) { next(e); }
});

router.post('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const plan = await MembershipPlan.create(req.body);
    res.status(201).json({ success: true, plan });
  } catch (e) { next(e); }
});

router.put('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const plan = await MembershipPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, plan });
  } catch (e) { next(e); }
});

router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    await MembershipPlan.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Plan deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
