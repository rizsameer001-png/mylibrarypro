const express = require('express');
const router  = express.Router();
const {
  uploadDigitalFile, updateReadingSettings,
  getReadUrl, updateProgress, addNote,
  purchaseBook, downloadBook, myPurchases, myReadingSessions,
} = require('../controllers/digitalController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Member routes
router.get('/my-purchases',      protect, myPurchases);
router.get('/my-reading',        protect, myReadingSessions);

// Per-book routes
router.post('/:bookId/upload',   protect, authorize('admin', 'manager'), upload.single('ebook'), uploadDigitalFile);
router.put('/:bookId/reading-settings', protect, authorize('admin'), updateReadingSettings);

router.get('/:bookId/read',      protect, getReadUrl);
router.put('/:bookId/progress',  protect, updateProgress);
router.post('/:bookId/notes',    protect, addNote);
router.post('/:bookId/purchase', protect, purchaseBook);
router.get('/:bookId/download',  protect, downloadBook);

module.exports = router;
