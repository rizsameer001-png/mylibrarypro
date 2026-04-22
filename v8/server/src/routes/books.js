const express = require('express');
const router  = express.Router();
const {
  getBooks, getBook, createBook, updateBook, deleteBook,
  importBooks, exportBooks, getPopularBooks,
} = require('../controllers/bookController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ── Static routes FIRST (before /:id) ─────────────────────────────────────
router.get('/popular',  getPopularBooks);
router.get('/export',   protect, authorize('admin', 'manager'), exportBooks);
router.post('/import',  protect, authorize('admin', 'manager'), upload.single('excel'), importBooks);

// ── Collection ─────────────────────────────────────────────────────────────
router.get('/',   getBooks);

// POST: client sends JSON (Cloudinary URLs already uploaded by browser)
// NO multer middleware — body is plain JSON
router.post('/',  protect, authorize('admin', 'manager'), createBook);

// ── Single item ────────────────────────────────────────────────────────────
router.get('/:id',    getBook);

// PUT: same — JSON body, no file upload
router.put('/:id',    protect, authorize('admin', 'manager'), updateBook);
router.delete('/:id', protect, authorize('admin'), deleteBook);

// ── Related books (same author or category) ────────────────────────────────
router.get('/:id/related', async (req, res, next) => {
  try {
    const Book = require('../models/Book');
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Not found' });

    const related = await Book.find({
      _id: { $ne: book._id },
      status: 'active',
      $or: [
        { authors:    { $in: book.authors } },
        { categories: { $in: book.categories } },
      ],
    })
      .populate('authors', 'name')
      .populate('categories', 'name')
      .limit(8)
      .select('title coverImage authors categories availableCopies totalCopies bookType isDigitalSale digitalPrice');

    res.json({ success: true, books: related });
  } catch (e) { next(e); }
});

module.exports = router;
