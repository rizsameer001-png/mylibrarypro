/**
 * bookController.js
 *
 * Upload strategy (production / Render):
 *   Client uploads file DIRECTLY to Cloudinary → gets back { secureUrl, publicId }
 *   Client sends those values in the JSON body — no file hits our server.
 *
 * Legacy fallback (USE_LOCAL_STORAGE=true / dev):
 *   Client sends multipart file → server uploads to Cloudinary sim folder.
 */
const path = require('path');
const fs   = require('fs');
const Book = require('../models/Book');
const XLSX = require('xlsx');
const { logActivity }           = require('../utils/activityLogger');
const { uploadToCloudinary,
        deleteFromCloudinary }  = require('../utils/cloudinary');
const { attachPriceDisplay }    = require('../utils/currency');
const { SystemSettings }        = require('../models/index');

const getCurrency  = async () => { const s = await SystemSettings.findOne(); return s?.currency || 'USD'; };
const cleanupTemp  = (p) => { try { if (p && fs.existsSync(p)) fs.unlinkSync(p); } catch {} };
const parseBool    = (v) => v === 'true' || v === true;

// ── GET /api/books ──────────────────────────────────────────────────────────
const getBooks = async (req, res, next) => {
  try {
    const { search, category, author, language, status, isEbook, bookType, page=1, limit=12, sort='-createdAt' } = req.query;
    const query = {};
    if (category) query.categories = category;
    if (author)   query.authors = author;
    if (language) query.language = language;
    if (status)   query.status = status;
    if (bookType) query.bookType = bookType;
    if (isEbook !== undefined) query.isEbook = isEbook === 'true';

    if (search) {
      const { Author } = require('../models/index');
      const matchingAuthors = await Author.find({ name: { $regex: search, $options: 'i' } }).select('_id');
      if (matchingAuthors.length > 0) {
        query.$or = [
          { authors: { $in: matchingAuthors.map(a => a._id) } },
          { title:   { $regex: search, $options: 'i' } },
          { isbn:    { $regex: search, $options: 'i' } },
        ];
      } else {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { isbn:  { $regex: search, $options: 'i' } },
        ];
      }
    }

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

const getPopularBooks = async (req, res, next) => {
  try {
    const [books, currency] = await Promise.all([
      Book.find({ status:'active' }).populate('authors','name').populate('categories','name').sort('-createdAt').limit(8),
      getCurrency(),
    ]);
    res.json({ success:true, books: books.map(b => attachPriceDisplay(b, currency)) });
  } catch(e) { next(e); }
};

const getBook = async (req, res, next) => {
  try {
    const [book, currency] = await Promise.all([
      Book.findById(req.params.id)
        .populate('authors','name bio').populate('categories','name slug').populate('publisher','name website'),
      getCurrency(),
    ]);
    if (!book) return res.status(404).json({ success:false, message:'Book not found' });
    res.json({ success:true, book: attachPriceDisplay(book, currency) });
  } catch(e) { next(e); }
};

// ── Shared helper: extract image/ebook data from request ────────────────────
// Supports BOTH direct-upload (URL in body) and legacy multipart (file upload)
// const extractMediaFromRequest = async (req, temps = []) => {
//   const result = {};

//   // ── Cover image ────────────────────────────────────────────────────────────
//   // Priority 1: client already uploaded to Cloudinary → sends URLs in body
//   if (req.body.coverImage && (req.body.coverImage.startsWith('http') || req.body.coverImage.startsWith('/'))) {
//     result.coverImage        = req.body.coverImage;
//     result.coverImagePublicId = req.body.coverImagePublicId || '';
//   }
//   // Priority 2: legacy multipart file → upload now
//   const coverFile = req.files?.cover?.[0];
//   if (coverFile) {
//     temps.push(coverFile.path);
//     const r = await uploadToCloudinary(coverFile.path, { folder:'lms/covers', resourceType:'image' });
//     result.coverImage         = r.secureUrl;
//     result.coverImagePublicId = r.publicId;
//     cleanupTemp(coverFile.path);
//   }

//   // ── Digital file ───────────────────────────────────────────────────────────
//   // Priority 1: client already uploaded to Cloudinary
//   if (req.body.cloudinarySecureUrl && req.body.cloudinarySecureUrl.startsWith('http')) {
//     result.isEbook             = true;
//     result.ebookFormat         = req.body.ebookFormat || '';
//     result.cloudinaryPublicId  = req.body.cloudinaryPublicId || '';
//     result.cloudinarySecureUrl = req.body.cloudinarySecureUrl;
//     result.cloudinaryBytes     = parseInt(req.body.cloudinaryBytes) || 0;
//   }
//   // Priority 2: legacy multipart
//   const ebookFile = req.files?.ebook?.[0];
//   if (ebookFile) {
//     temps.push(ebookFile.path);
//     const ext = path.extname(ebookFile.originalname).toLowerCase().replace('.','');
//     const r   = await uploadToCloudinary(ebookFile.path, { folder:'lms/ebooks', resourceType:'raw' });
//     result.isEbook             = true;
//     result.ebookFormat         = ext;
//     result.cloudinaryPublicId  = r.publicId;
//     result.cloudinarySecureUrl = r.secureUrl;
//     result.cloudinaryBytes     = r.bytes;
//     cleanupTemp(ebookFile.path);
//   }

//   return result;
// };

// ── Shared helper: extract image/ebook data from request ────────────────────
const extractMediaFromRequest = async (req, temps = []) => {
  const result = {};
  
  // Toggle this based on your .env
  const useCloudinary = process.env.NODE_ENV === 'production' || process.env.USE_CLOUDINARY === 'true';

  // ── Cover image ────────────────────────────────────────────────────────────
  // 1. Check if client already provided a Cloudinary URL (Direct Upload)
  if (req.body.coverImage && req.body.coverImage.startsWith('http')) {
    result.coverImage = req.body.coverImage;
    result.coverImagePublicId = req.body.coverImagePublicId || '';
  } 
  // 2. Handle file upload (Multipart)
  else {
    const coverFile = req.files?.cover?.[0];
    if (coverFile) {
      if (useCloudinary) {
        // PRODUCTION: Upload to Cloudinary
        const r = await uploadToCloudinary(coverFile.path, { folder: 'lms/covers', resourceType: 'image' });
        result.coverImage = r.secureUrl;
        result.coverImagePublicId = r.publicId;
        cleanupTemp(coverFile.path); // Delete local temp file
      } else {
        // DEVELOPMENT: Store local path
        // We save 'uploads/covers/filename.jpg' to the DB
        const fileName = coverFile.filename || path.basename(coverFile.path);
        result.coverImage = `uploads/covers/${fileName}`;
        result.coverImagePublicId = ''; // No public ID for local files
        // Note: Do NOT cleanupTemp here if your multer is already saving to 'uploads/covers'
      }
    }
  }

  // ── Digital file (E-book) ──────────────────────────────────────────────────
  if (req.body.cloudinarySecureUrl && req.body.cloudinarySecureUrl.startsWith('http')) {
    result.isEbook = true;
    result.ebookFormat = req.body.ebookFormat || '';
    result.cloudinaryPublicId = req.body.cloudinaryPublicId || '';
    result.cloudinarySecureUrl = req.body.cloudinarySecureUrl;
    result.cloudinaryBytes = parseInt(req.body.cloudinaryBytes) || 0;
  } else {
    const ebookFile = req.files?.ebook?.[0];
    if (ebookFile) {
      const ext = path.extname(ebookFile.originalname).toLowerCase().replace('.', '');
      if (useCloudinary) {
        const r = await uploadToCloudinary(ebookFile.path, { folder: 'lms/ebooks', resourceType: 'raw' });
        result.isEbook = true;
        result.ebookFormat = ext;
        result.cloudinaryPublicId = r.publicId;
        result.cloudinarySecureUrl = r.secureUrl;
        result.cloudinaryBytes = r.bytes;
        cleanupTemp(ebookFile.path);
      } else {
        const fileName = ebookFile.filename || path.basename(ebookFile.path);
        result.isEbook = true;
        result.ebookFormat = ext;
        result.cloudinarySecureUrl = `uploads/ebooks/${fileName}`;
        result.cloudinaryBytes = ebookFile.size || 0;
      }
    }
  }

  return result;
};

// ── POST /api/books ─────────────────────────────────────────────────────────
const createBook = async (req, res, next) => {
  const temps = [];
  try {
    const data     = { ...req.body, addedBy: req.user._id };
    const bookType = data.bookType || 'physical';
    data.bookType  = bookType;

    if (bookType === 'digital') {
      data.totalCopies = 0; data.availableCopies = 0;
    } else {
      const copies = parseInt(data.totalCopies) || 1;
      data.totalCopies = copies; data.availableCopies = copies;
    }

    ['readingEnabled','downloadEnabled','isDigitalSale','watermarkEnabled'].forEach(k => {
      if (k in data) data[k] = parseBool(data[k]);
    });
    if (!('watermarkEnabled' in req.body)) data.watermarkEnabled = true;
    if (typeof data.authors    === 'string') try { data.authors    = JSON.parse(data.authors);    } catch {}
    if (typeof data.categories === 'string') try { data.categories = JSON.parse(data.categories); } catch {}

    // Remove raw URL fields from data before merge (they come via extractMedia)
    delete data.coverImagePublicId;
    delete data.cloudinaryPublicId;
    delete data.cloudinarySecureUrl;
    delete data.cloudinaryBytes;
    delete data.ebookFormat;

    const media = await extractMediaFromRequest(req, temps);
    Object.assign(data, media);

    const book = await Book.create(data);
    await logActivity(req.user._id, 'CREATE_BOOK', `Added: ${book.title}`, req.ip, 'Books');
    res.status(201).json({ success:true, book });
  } catch(e) { temps.forEach(cleanupTemp); next(e); }
};

// ── PUT /api/books/:id ──────────────────────────────────────────────────────
const updateBook = async (req, res, next) => {
  const temps = [];
  try {
    const existing = await Book.findById(req.params.id);
    if (!existing) return res.status(404).json({ success:false, message:'Book not found' });

    const upd = { ...req.body };

    // Sync availableCopies on totalCopies change
    if (upd.totalCopies !== undefined) {
      const newTotal  = parseInt(upd.totalCopies) || 0;
      const issuedOut = (existing.totalCopies || 0) - (existing.availableCopies || 0);
      upd.totalCopies     = newTotal;
      upd.availableCopies = Math.max(0, newTotal - issuedOut);
    }
    if (upd.bookType === 'digital') { upd.totalCopies = 0; upd.availableCopies = 0; }

    ['readingEnabled','downloadEnabled','isDigitalSale','watermarkEnabled'].forEach(k => {
      if (k in upd) upd[k] = parseBool(upd[k]);
    });
    if (typeof upd.authors    === 'string') try { upd.authors    = JSON.parse(upd.authors);    } catch {}
    if (typeof upd.categories === 'string') try { upd.categories = JSON.parse(upd.categories); } catch {}

    // Remove raw URL fields — they come via extractMedia
    delete upd.coverImagePublicId;
    delete upd.cloudinaryPublicId;
    delete upd.cloudinarySecureUrl;
    delete upd.cloudinaryBytes;
    delete upd.ebookFormat;

    const media = await extractMediaFromRequest(req, temps);

    // Delete old Cloudinary assets if being replaced
    if (media.coverImage && existing.coverImagePublicId) {
      await deleteFromCloudinary(existing.coverImagePublicId, 'image').catch(() => {});
    }
    if (media.cloudinaryPublicId && existing.cloudinaryPublicId) {
      await deleteFromCloudinary(existing.cloudinaryPublicId, 'raw').catch(() => {});
    }

    Object.assign(upd, media);
    const book = await Book.findByIdAndUpdate(req.params.id, upd, { new:true, runValidators:true });
    await logActivity(req.user._id, 'UPDATE_BOOK', `Updated: ${book.title}`, req.ip, 'Books');
    res.json({ success:true, book });
  } catch(e) { temps.forEach(cleanupTemp); next(e); }
};

// ── DELETE /api/books/:id ───────────────────────────────────────────────────
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

// ── POST /api/books/import ──────────────────────────────────────────────────
const importBooks = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success:false, message:'No file uploaded' });
    const wb   = XLSX.readFile(req.file.path);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
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
          bookType,
          totalCopies:     bookType==='digital'?0:copies,
          availableCopies: bookType==='digital'?0:copies,
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

// ── GET /api/books/export ───────────────────────────────────────────────────
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
