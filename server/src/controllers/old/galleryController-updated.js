const path  = require('path');
const fs    = require('fs');
const Book  = require('../models/Book');
const { BookImage } = require('../models/digital');

// placeholder asset served as a static file
const PLACEHOLDER_URL = '/assets/no-cover.png';

// ── helpers ────────────────────────────────────────────────────────────────────
const publicUrl = (filePath) =>
  filePath ? `/${filePath.replace(/\\/g, '/')}` : PLACEHOLDER_URL;

// ── GET /api/books/:id/gallery ─────────────────────────────────────────────────
const getGallery = async (req, res, next) => {
  try {
    const images = await BookImage.find({ book: req.params.id }).sort('order');
    // If no images at all, return placeholder so frontend never shows a blank
    if (images.length === 0) {
      return res.json({ success: true, images: [], placeholder: PLACEHOLDER_URL });
    }
    res.json({ success: true, images });
  } catch (e) { next(e); }
};

// ── POST /api/books/:id/gallery ───────────────────────────────────────────────
// Accepts multipart field "images" (multiple files)
const addImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const existing = await BookImage.countDocuments({ book: req.params.id });

    const created = [];
    for (let i = 0; i < req.files.length; i++) {
      const file  = req.files[i];
      const label = req.body[`label_${i}`] || '';
      const img   = await BookImage.create({
        book:       req.params.id,
        url:        publicUrl(file.path),
        label,
        order:      existing + i,
        isPrimary:  existing === 0 && i === 0,
        uploadedBy: req.user._id,
      });
      created.push(img);
    }

    // Sync primary cover to Book.coverImage
    const primary = await BookImage.findOne({ book: req.params.id, isPrimary: true });
    if (primary) {
      await Book.findByIdAndUpdate(req.params.id, { coverImage: primary.url });
    }

    res.status(201).json({ success: true, images: created });
  } catch (e) { next(e); }
};

// ── PUT /api/books/:id/gallery/reorder ────────────────────────────────────────
// Body: { order: [{ _id, order, isPrimary? }] }
const reorderImages = async (req, res, next) => {
  try {
    const { order } = req.body; // array of { _id, order, isPrimary }
    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, message: 'order must be an array' });
    }

    // Reset isPrimary
    await BookImage.updateMany({ book: req.params.id }, { isPrimary: false });

    for (const item of order) {
      await BookImage.findByIdAndUpdate(item._id, {
        order:     item.order,
        isPrimary: !!item.isPrimary,
        label:     item.label !== undefined ? item.label : undefined,
      });
    }

    // Sync primary to Book
    const primary = await BookImage.findOne({ book: req.params.id, isPrimary: true });
    if (primary) {
      await Book.findByIdAndUpdate(req.params.id, { coverImage: primary.url });
    }

    const images = await BookImage.find({ book: req.params.id }).sort('order');
    res.json({ success: true, images });
  } catch (e) { next(e); }
};

// ── DELETE /api/books/:id/gallery/:imageId ────────────────────────────────────
const deleteImage = async (req, res, next) => {
  try {
    const img = await BookImage.findOneAndDelete({
      _id:  req.params.imageId,
      book: req.params.id,
    });
    if (!img) return res.status(404).json({ success: false, message: 'Image not found' });

    // Delete physical file if it lives on disk
    if (img.url && img.url.startsWith('/uploads/')) {
      const diskPath = path.join(__dirname, '../../', img.url);
      if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
    }

    // If deleted image was primary, promote first remaining
    if (img.isPrimary) {
      const next_ = await BookImage.findOne({ book: req.params.id }).sort('order');
      if (next_) {
        next_.isPrimary = true;
        await next_.save();
        await Book.findByIdAndUpdate(req.params.id, { coverImage: next_.url });
      } else {
        await Book.findByIdAndUpdate(req.params.id, { coverImage: null });
      }
    }

    res.json({ success: true, message: 'Image deleted' });
  } catch (e) { next(e); }
};

// ── PUT /api/books/:id/gallery/:imageId/primary ───────────────────────────────
const setPrimary = async (req, res, next) => {
  try {
    await BookImage.updateMany({ book: req.params.id }, { isPrimary: false });
    const img = await BookImage.findByIdAndUpdate(
      req.params.imageId,
      { isPrimary: true },
      { new: true },
    );
    if (!img) return res.status(404).json({ success: false, message: 'Image not found' });
    await Book.findByIdAndUpdate(req.params.id, { coverImage: img.url });
    res.json({ success: true, image: img });
  } catch (e) { next(e); }
};

module.exports = { getGallery, addImages, reorderImages, deleteImage, setPrimary };
