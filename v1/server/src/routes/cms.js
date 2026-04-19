const express = require('express');
const router = express.Router();
const { CMS, SystemSettings } = require('../models/index');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Get CMS content (public)
router.get('/', async (req, res, next) => {
  try {
    let cms = await CMS.findOne();
    if (!cms) cms = await CMS.create({});
    res.json({ success: true, cms });
  } catch (e) { next(e); }
});

// Update CMS content
router.put('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    let cms = await CMS.findOne();
    if (!cms) cms = new CMS();
    Object.assign(cms, req.body);
    await cms.save();
    res.json({ success: true, cms });
  } catch (e) { next(e); }
});

// Add testimonial
router.post('/testimonials', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    let cms = await CMS.findOne();
    if (!cms) cms = new CMS();
    cms.testimonials.push(req.body);
    await cms.save();
    res.json({ success: true, cms });
  } catch (e) { next(e); }
});

// Delete testimonial
router.delete('/testimonials/:index', protect, authorize('admin'), async (req, res, next) => {
  try {
    const cms = await CMS.findOne();
    if (cms) {
      cms.testimonials.splice(parseInt(req.params.index), 1);
      await cms.save();
    }
    res.json({ success: true, message: 'Testimonial removed' });
  } catch (e) { next(e); }
});

// Get system settings (public for site name/logo)
router.get('/settings', async (req, res, next) => {
  try {
    let settings = await SystemSettings.findOne();
    if (!settings) settings = await SystemSettings.create({});
    res.json({ success: true, settings });
  } catch (e) { next(e); }
});

// Update system settings
router.put('/settings', protect, authorize('admin'), upload.single('logo'), async (req, res, next) => {
  try {
    let settings = await SystemSettings.findOne();
    if (!settings) settings = new SystemSettings();
    Object.assign(settings, req.body);
    if (req.file) settings.logo = req.file.path;
    await settings.save();
    res.json({ success: true, settings });
  } catch (e) { next(e); }
});

module.exports = router;
