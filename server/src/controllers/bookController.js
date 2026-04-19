const path = require('path');
const fs   = require('fs');
const Book = require('../models/Book');
const XLSX = require('xlsx');
const { logActivity }           = require('../utils/activityLogger');
const { uploadToCloudinary,
        deleteFromCloudinary }  = require('../utils/cloudinary');
const { attachPriceDisplay }    = require('../utils/currency');
const { SystemSettings }        = require('../models/index');

const getCurrency = async () => {
  const s = await SystemSettings.findOne();
  return s?.currency || 'USD';
};

const cleanupTemp = (p) => { try { if (p && fs.existsSync(p)) fs.unlinkSync(p); } catch {} };

const parseBool = (v) => v === 'true' || v === true;

// GET /api/books
const getBooks = async (req, res, next) => {
  try {
    const { search, category, author, language, status, isEbook, bookType, page=1, limit=12, sort='-createdAt' } = req.query;
    const query = {};
    if (search)   query.$text = { $search: search };
    if (category) query.categories = category;
    if (author)   query.authors = author;
    if (language) query.language = language;
    if (status)   query.status = status;
    if (bookType) query.bookType = bookType;
    if (isEbook !== undefined) query.isEbook = isEbook === 'true';

    const [total, books, currency] = await Promise.all([
      Book.countDocuments(query),
      Book.find(query)
        .populate('authors','name').populate('categories','name slug').populate('publisher','name')
        .sort(sort).limit(parseInt(limit)).skip((parseInt(page)-1)*parseInt(limit)),
      getCurrency(),
    ]);

    res.json({
      success: true,
      books: books.map(b => attachPriceDisplay(b, currency)),
      pagination: { total, page: parseInt(page), pages: Math.ceil(total/parseInt(limit)), limit: parseInt(limit) },
    });
  } catch(e) { next(e); }
};

// GET /api/books/popular
const getPopularBooks = async (req, res, next) => {
  try {
    const [books, currency] = await Promise.all([
      Book.find({ status:'active' }).populate('authors','name').populate('categories','name').sort('-createdAt').limit(8),
      getCurrency(),
    ]);
    res.json({ success:true, books: books.map(b => attachPriceDisplay(b, currency)) });
  } catch(e) { next(e); }
};

// GET /api/books/:id
const getBook = async (req, res, next) => {
  try {
    const [book, currency] = await Promise.all([
      Book.findById(req.params.id).populate('authors','name bio').populate('categories','name slug').populate('publisher','name website'),
      getCurrency(),
    ]);
    if (!book) return res.status(404).json({ success:false, message:'Book not found' });
    res.json({ success:true, book: attachPriceDisplay(book, currency) });
  } catch(e) { next(e); }
};

// POST /api/books
const createBook = async (req, res, next) => {
  const temps = [];
  try {
    const data = { ...req.body, addedBy: req.user._id };
    const bookType = data.bookType || 'physical';
    data.bookType = bookType;

    if (bookType === 'digital') { data.totalCopies = 0; data.availableCopies = 0; }
    else if (data.totalCopies)  { data.availableCopies = parseInt(data.totalCopies); }

    ['readingEnabled','downloadEnabled','isDigitalSale','watermarkEnabled'].forEach(k => {
      if (k in data) data[k] = parseBool(data[k]);
    });
    if (!('watermarkEnabled' in req.body)) data.watermarkEnabled = true;

    if (typeof data.authors    === 'string') try { data.authors    = JSON.parse(data.authors);    } catch {}
    if (typeof data.categories === 'string') try { data.categories = JSON.parse(data.categories); } catch {}

    // Cover image upload
    const coverFile = req.files?.cover?.[0];
    if (coverFile) {
      temps.push(coverFile.path);
      const r = await uploadToCloudinary(coverFile.path, { folder:'lms/covers', resourceType:'image' });
      data.coverImage = r.secureUrl;  data.coverImagePublicId = r.publicId;
      cleanupTemp(coverFile.path);
    }

    // Digital file upload (PDF/EPUB/MOBI)
    const ebookFile = req.files?.ebook?.[0];
    if (ebookFile) {
      temps.push(ebookFile.path);
      const ext = path.extname(ebookFile.originalname).toLowerCase().replace('.','');
      const r   = await uploadToCloudinary(ebookFile.path, { folder:'lms/ebooks', resourceType:'raw' });
      data.isEbook = true;  data.ebookFormat = ext;
      data.cloudinaryPublicId = r.publicId;  data.cloudinarySecureUrl = r.secureUrl;  data.cloudinaryBytes = r.bytes;
      cleanupTemp(ebookFile.path);
    }

    const book = await Book.create(data);
    await logActivity(req.user._id, 'CREATE_BOOK', `Added: ${book.title}`, req.ip, 'Books');
    res.status(201).json({ success:true, book });
  } catch(e) { temps.forEach(cleanupTemp); next(e); }
};

// PUT /api/books/:id
const updateBook = async (req, res, next) => {
  const temps = [];
  try {
    const existing = await Book.findById(req.params.id);
    if (!existing) return res.status(404).json({ success:false, message:'Book not found' });

    const upd = { ...req.body };
    ['readingEnabled','downloadEnabled','isDigitalSale','watermarkEnabled'].forEach(k => {
      if (k in upd) upd[k] = parseBool(upd[k]);
    });
    if (typeof upd.authors    === 'string') try { upd.authors    = JSON.parse(upd.authors);    } catch {}
    if (typeof upd.categories === 'string') try { upd.categories = JSON.parse(upd.categories); } catch {}

    const coverFile = req.files?.cover?.[0];
    if (coverFile) {
      temps.push(coverFile.path);
      if (existing.coverImagePublicId) await deleteFromCloudinary(existing.coverImagePublicId,'image').catch(()=>{});
      const r = await uploadToCloudinary(coverFile.path, { folder:'lms/covers', resourceType:'image' });
      upd.coverImage = r.secureUrl;  upd.coverImagePublicId = r.publicId;
      cleanupTemp(coverFile.path);
    }

    const ebookFile = req.files?.ebook?.[0];
    if (ebookFile) {
      temps.push(ebookFile.path);
      if (existing.cloudinaryPublicId) await deleteFromCloudinary(existing.cloudinaryPublicId,'raw').catch(()=>{});
      const ext = path.extname(ebookFile.originalname).toLowerCase().replace('.','');
      const r   = await uploadToCloudinary(ebookFile.path, { folder:'lms/ebooks', resourceType:'raw' });
      upd.isEbook=true; upd.ebookFormat=ext;
      upd.cloudinaryPublicId=r.publicId; upd.cloudinarySecureUrl=r.secureUrl; upd.cloudinaryBytes=r.bytes;
      cleanupTemp(ebookFile.path);
    }

    const book = await Book.findByIdAndUpdate(req.params.id, upd, { new:true, runValidators:true });
    await logActivity(req.user._id, 'UPDATE_BOOK', `Updated: ${book.title}`, req.ip, 'Books');
    res.json({ success:true, book });
  } catch(e) { temps.forEach(cleanupTemp); next(e); }
};

// DELETE /api/books/:id
const deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ success:false, message:'Book not found' });
    if (book.coverImagePublicId) await deleteFromCloudinary(book.coverImagePublicId,'image').catch(()=>{});
    if (book.cloudinaryPublicId) await deleteFromCloudinary(book.cloudinaryPublicId,'raw').catch(()=>{});
    await logActivity(req.user._id, 'DELETE_BOOK', `Deleted: ${book.title}`, req.ip, 'Books');
    res.json({ success:true, message:'Book deleted' });
  } catch(e) { next(e); }
};

// POST /api/books/import
const importBooks = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success:false, message:'No file uploaded' });
    const rows    = XLSX.utils.sheet_to_json(XLSX.readFile(req.file.path).Sheets[XLSX.readFile(req.file.path).SheetNames[0]]);
    const results = { success:0, failed:0, errors:[] };
    for (const row of rows) {
      try {
        const bookType = (row['Book Type']||row['book_type']||'physical').toLowerCase();
        const copies   = parseInt(row['Copies']||row['total_copies']||1);
        await Book.create({
          title: row['Title']||row['title'], isbn: row['ISBN']||row['isbn'],
          description: row['Description']||row['description'],
          language: row['Language']||row['language']||'English',
          publicationYear: row['Year']||row['publication_year'],
          bookType, totalCopies: bookType==='digital'?0:copies, availableCopies: bookType==='digital'?0:copies,
          addedBy: req.user._id,
        });
        results.success++;
      } catch(err) { results.failed++; results.errors.push(`Row ${rows.indexOf(row)+1}: ${err.message}`); }
    }
    cleanupTemp(req.file.path);
    await logActivity(req.user._id,'IMPORT_BOOKS',`Imported ${results.success} books`,req.ip,'Books');
    res.json({ success:true, results });
  } catch(e) { next(e); }
};

// GET /api/books/export
const exportBooks = async (req, res, next) => {
  try {
    const books = await Book.find({}).populate('authors','name').populate('categories','name').populate('publisher','name');
    const data  = books.map(b => ({
      Title: b.title, ISBN: b.isbn, 'Book Type': b.bookType,
      Authors: b.authors.map(a=>a.name).join(', '), Categories: b.categories.map(c=>c.name).join(', '),
      Publisher: b.publisher?.name, Language: b.language, Year: b.publicationYear,
      'Total Copies': b.totalCopies, Available: b.availableCopies,
      'Digital Format': b.ebookFormat||'', 'Reading': b.readingEnabled?'Yes':'No',
      'For Sale': b.isDigitalSale?'Yes':'No', Price: b.digitalPrice||0, Status: b.status,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data),'Books');
    const buf = XLSX.write(wb,{type:'buffer',bookType:'xlsx'});
    res.setHeader('Content-Disposition','attachment; filename=books-export.xlsx');
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch(e) { next(e); }
};

module.exports = { getBooks, getBook, createBook, updateBook, deleteBook, importBooks, exportBooks, getPopularBooks };
