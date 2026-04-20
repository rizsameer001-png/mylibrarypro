const express = require('express');
const router = express.Router();
const {
  getBooks, getBook, createBook, updateBook, deleteBook,
  importBooks, exportBooks, getPopularBooks
} = require('../controllers/bookController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/popular', getPopularBooks);
router.get('/export', protect, authorize('admin', 'manager'), exportBooks);
router.post('/import', protect, authorize('admin', 'manager'), upload.single('excel'), importBooks);

router.get('/', getBooks);
router.post('/', protect, authorize('admin', 'manager'),
  upload.fields([{ name: 'cover', maxCount: 1 }, { name: 'ebook', maxCount: 1 }]),
  createBook
);

router.get('/:id', getBook);
router.put('/:id', protect, authorize('admin', 'manager'),
  upload.fields([{ name: 'cover', maxCount: 1 }, { name: 'ebook', maxCount: 1 }]),
  updateBook
);
router.delete('/:id', protect, authorize('admin'), deleteBook);

module.exports = router;
