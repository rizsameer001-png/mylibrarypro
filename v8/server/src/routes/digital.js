const express = require('express');
const router  = express.Router();
const {
  uploadDigitalFile, updateReadingSettings,
  getReadUrl, updateProgress, addNote,
  purchaseBook, downloadBook, myPurchases, myReadingSessions,
} = require('../controllers/digitalController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ── Member routes ──────────────────────────────────────────────────────────
router.get('/my-purchases',      protect, myPurchases);
router.get('/my-reading',        protect, myReadingSessions);

// ── Per-book routes ────────────────────────────────────────────────────────
router.post('/:bookId/upload',   protect, authorize('admin', 'manager'), upload.single('ebook'), uploadDigitalFile);
router.put('/:bookId/reading-settings', protect, authorize('admin'), updateReadingSettings);

router.get('/:bookId/read',      protect, getReadUrl);
router.put('/:bookId/progress',  protect, updateProgress);
router.post('/:bookId/notes',    protect, addNote);
router.post('/:bookId/purchase', protect, purchaseBook);

// Download: free books allow guests; paid books require auth
// We use optionalAuth pattern — attach user if token present, don't block if absent
router.get('/:bookId/download', async (req, res, next) => {
  // Try to attach user from token if present (optional auth)
  const jwt  = require('jsonwebtoken');
  const User = require('../models/User');
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      req.user = await User.findById(decoded.id).select('-password');
    } catch {}
  }
  next();
}, downloadBook);

module.exports = router;
