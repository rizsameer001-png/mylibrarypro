const express = require('express');
const router  = express.Router();
const {
  initReader, getPage, saveContent, saveProgress,
  getBookmarks, addBookmark, deleteBookmark,
} = require('../controllers/readerController');
const { protect, authorize } = require('../middleware/auth');

// ── Public reader (auth required for progress) ─────────────────────────────
router.get('/:bookId/init',              protect, initReader);
router.get('/:bookId/page/:pageNum',     protect, getPage);
router.put('/:bookId/progress',          protect, saveProgress);

// ── Bookmarks ──────────────────────────────────────────────────────────────
router.get('/:bookId/bookmarks',         protect, getBookmarks);
router.post('/:bookId/bookmarks',        protect, addBookmark);
router.delete('/:bookId/bookmarks/:bmId',protect, deleteBookmark);

// ── Admin: upload extracted text content ──────────────────────────────────
router.post('/:bookId/content',  protect, authorize('admin', 'manager'), saveContent);

module.exports = router;
