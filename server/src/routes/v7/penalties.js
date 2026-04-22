const express = require('express');
const router = express.Router();
const { PenaltyRule } = require('../models/index');
const Circulation = require('../models/Circulation');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// Get penalty rules
router.get('/rules', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    let rule = await PenaltyRule.findOne();
    if (!rule) rule = await PenaltyRule.create({ perDayFine: 1, gracePeriodDays: 0, maxFineAmount: 100 });
    res.json({ success: true, rule });
  } catch (e) { next(e); }
});

// Update penalty rules
router.put('/rules', protect, authorize('admin'), async (req, res, next) => {
  try {
    let rule = await PenaltyRule.findOne();
    if (!rule) rule = new PenaltyRule();
    Object.assign(rule, req.body);
    await rule.save();
    res.json({ success: true, rule });
  } catch (e) { next(e); }
});

// Mark fine as paid
router.put('/:circulationId/pay', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const circ = await Circulation.findByIdAndUpdate(
      req.params.circulationId,
      { finePaid: true, finePaidDate: new Date() },
      { new: true }
    ).populate('member', 'name').populate('book', 'title');
    if (!circ) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, circulation: circ });
  } catch (e) { next(e); }
});

// Get outstanding fines
router.get('/outstanding', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const fines = await Circulation.find({ fine: { $gt: 0 }, finePaid: false })
      .populate('book', 'title isbn')
      .populate('member', 'name email')
      .sort('-fine');
    res.json({ success: true, fines });
  } catch (e) { next(e); }
});

module.exports = router;
