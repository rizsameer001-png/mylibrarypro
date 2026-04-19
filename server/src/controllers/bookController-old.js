const Book = require('../models/Book');
const { Category, Author, Publisher } = require('../models/index');
const XLSX = require('xlsx');
const { logActivity } = require('../utils/activityLogger');

// @desc    Get all books
// @route   GET /api/books
// @access  Public
const getBooks = async (req, res, next) => {
  try {
    const {
      search, category, author, language, status,
      isEbook, page = 1, limit = 12, sort = '-createdAt'
    } = req.query;

    const query = {};
    if (search) query.$text = { $search: search };
    if (category) query.categories = category;
    if (author) query.authors = author;
    if (language) query.language = language;
    if (status) query.status = status;
    if (isEbook !== undefined) query.isEbook = isEbook === 'true';

    const total = await Book.countDocuments(query);
    const books = await Book.find(query)
      .populate('authors', 'name')
      .populate('categories', 'name slug')
      .populate('publisher', 'name')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({
      success: true,
      books,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) { next(error); }
};

// @desc    Get single book
// @route   GET /api/books/:id
// @access  Public
const getBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id)
      .populate('authors', 'name bio')
      .populate('categories', 'name slug')
      .populate('publisher', 'name website');

    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    res.json({ success: true, book });
  } catch (error) { next(error); }
};

// @desc    Create book
// @route   POST /api/books
// @access  Admin/Manager
const createBook = async (req, res, next) => {
  try {
    const bookData = { ...req.body, addedBy: req.user._id };
    if (req.files?.cover) bookData.coverImage = req.files.cover[0].path;
    if (req.files?.ebook) {
      bookData.ebookFile = req.files.ebook[0].path;
      bookData.ebookFormat = req.files.ebook[0].mimetype.includes('pdf') ? 'pdf' : 'epub';
      bookData.isEbook = true;
    }

    // Set availableCopies equal to totalCopies on creation
    if (bookData.totalCopies) bookData.availableCopies = parseInt(bookData.totalCopies);

    const book = await Book.create(bookData);
    await logActivity(req.user._id, 'CREATE_BOOK', `Added book: ${book.title}`, req.ip, 'Books');
    res.status(201).json({ success: true, book });
  } catch (error) { next(error); }
};

// @desc    Update book
// @route   PUT /api/books/:id
// @access  Admin/Manager
const updateBook = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    if (req.files?.cover) updateData.coverImage = req.files.cover[0].path;
    if (req.files?.ebook) {
      updateData.ebookFile = req.files.ebook[0].path;
      updateData.ebookFormat = req.files.ebook[0].mimetype.includes('pdf') ? 'pdf' : 'epub';
    }

    const book = await Book.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });

    await logActivity(req.user._id, 'UPDATE_BOOK', `Updated book: ${book.title}`, req.ip, 'Books');
    res.json({ success: true, book });
  } catch (error) { next(error); }
};

// @desc    Delete book
// @route   DELETE /api/books/:id
// @access  Admin only
const deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    await logActivity(req.user._id, 'DELETE_BOOK', `Deleted book: ${book.title}`, req.ip, 'Books');
    res.json({ success: true, message: 'Book deleted' });
  } catch (error) { next(error); }
};

// @desc    Bulk import books from Excel
// @route   POST /api/books/import
// @access  Admin/Manager
const importBooks = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const results = { success: 0, failed: 0, errors: [] };

    for (const row of rows) {
      try {
        const bookData = {
          title: row['Title'] || row['title'],
          isbn: row['ISBN'] || row['isbn'],
          description: row['Description'] || row['description'],
          language: row['Language'] || row['language'] || 'English',
          publicationYear: row['Year'] || row['publication_year'],
          totalCopies: parseInt(row['Copies'] || row['total_copies'] || 1),
          addedBy: req.user._id,
        };
        bookData.availableCopies = bookData.totalCopies;

        if (!bookData.title) { results.failed++; continue; }
        await Book.create(bookData);
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${rows.indexOf(row) + 1}: ${err.message}`);
      }
    }

    await logActivity(req.user._id, 'IMPORT_BOOKS', `Imported ${results.success} books`, req.ip, 'Books');
    res.json({ success: true, results });
  } catch (error) { next(error); }
};

// @desc    Export books to Excel
// @route   GET /api/books/export
// @access  Admin/Manager
const exportBooks = async (req, res, next) => {
  try {
    const books = await Book.find({})
      .populate('authors', 'name')
      .populate('categories', 'name')
      .populate('publisher', 'name');

    const data = books.map(b => ({
      Title: b.title,
      ISBN: b.isbn,
      Authors: b.authors.map(a => a.name).join(', '),
      Categories: b.categories.map(c => c.name).join(', '),
      Publisher: b.publisher?.name,
      Language: b.language,
      Year: b.publicationYear,
      'Total Copies': b.totalCopies,
      'Available Copies': b.availableCopies,
      'Is Ebook': b.isEbook ? 'Yes' : 'No',
      Status: b.status,
    }));

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Books');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=books-export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) { next(error); }
};

// @desc    Get popular books
// @route   GET /api/books/popular
// @access  Public
const getPopularBooks = async (req, res, next) => {
  try {
    const books = await Book.find({ status: 'active' })
      .populate('authors', 'name')
      .populate('categories', 'name')
      .sort('-createdAt')
      .limit(8);
    res.json({ success: true, books });
  } catch (error) { next(error); }
};

module.exports = { getBooks, getBook, createBook, updateBook, deleteBook, importBooks, exportBooks, getPopularBooks };
