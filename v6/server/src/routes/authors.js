/**
 * /api/authors  — Full Authors module
 * Public:  GET / (list), GET /featured, GET /:slug (profile)
 * Admin:   POST, PUT /:id, DELETE /:id, PUT /:id/toggle-featured
 */
const express = require('express');
const router  = express.Router();
const mongoose = require('mongoose');
const { Author } = require('../models/index');
const Book       = require('../models/Book');
const { protect, authorize }  = require('../middleware/auth');
const { deleteFromCloudinary} = require('../utils/cloudinary');

// ── helpers ────────────────────────────────────────────────────────────────
const activeFilter = { $or: [{ isActive: true }, { isActive: { $exists: false } }] };

// ── GET /api/authors  — listing with full filter/sort/pagination ───────────
router.get('/', async (req, res, next) => {
  try {
    const {
      search, genre, language, letter,
      sort = 'name', featured,
      page = 1, limit = 24,
    } = req.query;

    const query = { ...activeFilter };
    if (search)   query.name     = { $regex: search, $options: 'i' };
    if (genre)    query.genres   = genre;
    if (language) query.languages= language;
    if (letter)   query.name     = { $regex: `^${letter}`, $options: 'i' };
    if (featured === 'true') query.isFeatured = true;

    const sortMap = {
      name:      { name: 1 },
      '-name':   { name: -1 },
      popular:   { popularity: -1, bookCount: -1 },
      latest:    { createdAt: -1 },
    };
    const sortObj = sortMap[sort] || { name: 1 };

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Author.countDocuments(query);
    const authors = await Author.find(query, {
      name:1, slug:1, avatar:1, nationality:1, shortBio:1,
      bookCount:1, isFeatured:1, genres:1, languages:1,
      birthYear:1, deathYear:1, popularity:1,
    }).sort(sortObj).limit(parseInt(limit)).skip(skip);

    // Available genre & language facets for filters
    const [genres, languages] = await Promise.all([
      Author.distinct('genres',   { ...activeFilter, genres:    { $exists: true, $ne: '' } }),
      Author.distinct('languages',{ ...activeFilter, languages: { $exists: true, $ne: '' } }),
    ]);

    res.json({
      success: true, authors,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), limit: parseInt(limit) },
      facets: { genres: genres.filter(Boolean), languages: languages.filter(Boolean) },
    });
  } catch (e) { next(e); }
});

// ── GET /api/authors/featured ─────────────────────────────────────────────
router.get('/featured', async (req, res, next) => {
  try {
    const authors = await Author.find({ ...activeFilter, isFeatured: true },
      { name:1, slug:1, avatar:1, nationality:1, shortBio:1, bookCount:1, genres:1 })
      .sort({ popularity: -1 }).limit(12);
    res.json({ success: true, authors });
  } catch (e) { next(e); }
});

// ── GET /api/authors/letters ── which letters have authors ────────────────
router.get('/letters', async (req, res, next) => {
  try {
    const authors = await Author.find(activeFilter, { name: 1 });
    const letters = [...new Set(authors.map(a => a.name[0]?.toUpperCase()).filter(Boolean))].sort();
    res.json({ success: true, letters });
  } catch (e) { next(e); }
});

// ── GET /api/authors/:slug  — full profile (by slug OR id) ────────────────
router.get('/:slug', async (req, res, next) => {
  try {
    const id    = req.params.slug;
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { slug: id };

    const author = await Author.findOne({ ...query, ...activeFilter });
    if (!author) return res.status(404).json({ success: false, message: 'Author not found' });

    // Increment popularity
    Author.findByIdAndUpdate(author._id, { $inc: { popularity: 1 } }).catch(() => {});

    // Get books by this author
    const books = await Book.find({ authors: author._id, status: 'active' },
      { title:1, coverImage:1, publicationYear:1, bookType:1, availableCopies:1 })
      .sort('-publicationYear').limit(20);

    res.json({ success: true, author, books });
  } catch (e) { next(e); }
});

// ── POST /api/authors ─────────────────────────────────────────────────────
router.post('/', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const data = { ...req.body, isActive: true };
    if (Array.isArray(data.genres))    {} // already array
    if (typeof data.genres    === 'string') data.genres    = data.genres.split(',').map(s => s.trim()).filter(Boolean);
    if (typeof data.languages === 'string') data.languages = data.languages.split(',').map(s => s.trim()).filter(Boolean);
    if (typeof data.timeline  === 'string') try { data.timeline  = JSON.parse(data.timeline);  } catch {}
    if (typeof data.youtubeLinks === 'string') try { data.youtubeLinks = JSON.parse(data.youtubeLinks); } catch {}
    if (typeof data.audioLinks   === 'string') try { data.audioLinks   = JSON.parse(data.audioLinks);   } catch {}
    if (typeof data.articles     === 'string') try { data.articles     = JSON.parse(data.articles);     } catch {}
    if (typeof data.multiBio     === 'string') try { data.multiBio     = JSON.parse(data.multiBio);     } catch {}

    const author = new Author(data);
    await author.save();                  // triggers slug pre-save hook
    res.status(201).json({ success: true, author });
  } catch (e) { next(e); }
});

// ── PUT /api/authors/:id ──────────────────────────────────────────────────
router.put('/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (typeof data.genres    === 'string') data.genres    = data.genres.split(',').map(s => s.trim()).filter(Boolean);
    if (typeof data.languages === 'string') data.languages = data.languages.split(',').map(s => s.trim()).filter(Boolean);
    if (typeof data.timeline  === 'string') try { data.timeline  = JSON.parse(data.timeline);  } catch {}
    if (typeof data.youtubeLinks === 'string') try { data.youtubeLinks = JSON.parse(data.youtubeLinks); } catch {}
    if (typeof data.audioLinks   === 'string') try { data.audioLinks   = JSON.parse(data.audioLinks);   } catch {}
    if (typeof data.articles     === 'string') try { data.articles     = JSON.parse(data.articles);     } catch {}
    if (typeof data.multiBio     === 'string') try { data.multiBio     = JSON.parse(data.multiBio);     } catch {}

    const existing = await Author.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Author not found' });

    // Clean old avatar from Cloudinary if replaced
    if (data.avatar && data.avatar !== existing.avatar && existing.avatarPublicId) {
      deleteFromCloudinary(existing.avatarPublicId, 'image').catch(() => {});
    }

    Object.assign(existing, data);
    await existing.save();
    res.json({ success: true, author: existing });
  } catch (e) { next(e); }
});

// ── PUT /api/authors/:id/toggle-featured ──────────────────────────────────
router.put('/:id/toggle-featured', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const author = await Author.findById(req.params.id);
    if (!author) return res.status(404).json({ success: false, message: 'Not found' });
    author.isFeatured = !author.isFeatured;
    await author.save();
    res.json({ success: true, isFeatured: author.isFeatured });
  } catch (e) { next(e); }
});

// ── DELETE /api/authors/:id ───────────────────────────────────────────────
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const author = await Author.findByIdAndDelete(req.params.id);
    if (!author) return res.status(404).json({ success: false, message: 'Author not found' });
    if (author.avatarPublicId) deleteFromCloudinary(author.avatarPublicId, 'image').catch(() => {});
    res.json({ success: true, message: 'Author deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
