/**
 * galleryController.js
 * Manages the image gallery for a book: upload to Cloudinary, reorder, set primary, delete.
 */
const path = require('path');
const fs   = require('fs');
const Book = require('../models/Book');
const { BookImage }              = require('../models/digital');
const { uploadToCloudinary,
        deleteFromCloudinary }   = require('../utils/cloudinary');

const PLACEHOLDER = '/no-cover.svg';
const cleanTemp   = (p) => { try { if (p && fs.existsSync(p)) fs.unlinkSync(p); } catch {} };

// ── GET /api/books/:id/gallery ────────────────────────────────────────────────
const getGallery = async (req, res, next) => {
  try {
    const images = await BookImage.find({ book: req.params.id }).sort('order');
    res.json({ success: true, images, placeholder: PLACEHOLDER });
  } catch (e) { next(e); }
};

// ── POST /api/books/:id/gallery ───────────────────────────────────────────────
const addImages = async (req, res, next) => {
  const temps = [];
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const existing = await BookImage.countDocuments({ book: req.params.id });
    const created  = [];

    for (let i = 0; i < req.files.length; i++) {
      const file  = req.files[i];
      temps.push(file.path);
      const label = (req.body && req.body[`label_${i}`]) || '';

      // Upload to Cloudinary
      const result = await uploadToCloudinary(file.path, {
        folder:       'lms/gallery',
        resourceType: 'image',
      });
      cleanTemp(file.path);

      const isPrimary = existing === 0 && i === 0;
      const img = await BookImage.create({
        book:       req.params.id,
        url:        result.secureUrl,
        publicId:   result.publicId,
        label,
        order:      existing + i,
        isPrimary,
        uploadedBy: req.user._id,
      });
      created.push(img);
    }

    // Sync primary cover to Book
    const primary = await BookImage.findOne({ book: req.params.id, isPrimary: true });
    if (primary) {
      await Book.findByIdAndUpdate(req.params.id, {
        coverImage:         primary.url,
        coverImagePublicId: primary.publicId,
      });
    }

    res.status(201).json({ success: true, images: created });
  } catch (e) {
    temps.forEach(cleanTemp);
    next(e);
  }
};

// ── PUT /api/books/:id/gallery/reorder ────────────────────────────────────────
const reorderImages = async (req, res, next) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, message: 'order must be an array' });
    }

    // Reset isPrimary on all
    await BookImage.updateMany({ book: req.params.id }, { isPrimary: false });

    for (const item of order) {
      const upd = { order: item.order, isPrimary: !!item.isPrimary };
      if (item.label !== undefined) upd.label = item.label;
      await BookImage.findByIdAndUpdate(item._id, upd);
    }

    // Sync primary to Book.coverImage
    const primary = await BookImage.findOne({ book: req.params.id, isPrimary: true });
    if (primary) {
      await Book.findByIdAndUpdate(req.params.id, {
        coverImage:         primary.url,
        coverImagePublicId: primary.publicId,
      });
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

    // Delete from Cloudinary
    if (img.publicId) {
      await deleteFromCloudinary(img.publicId, 'image').catch(() => {});
    }

    // If deleted image was primary, promote next
    if (img.isPrimary) {
      const next_ = await BookImage.findOne({ book: req.params.id }).sort('order');
      if (next_) {
        next_.isPrimary = true;
        await next_.save();
        await Book.findByIdAndUpdate(req.params.id, {
          coverImage:         next_.url,
          coverImagePublicId: next_.publicId,
        });
      } else {
        await Book.findByIdAndUpdate(req.params.id, { coverImage: null, coverImagePublicId: null });
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

    await Book.findByIdAndUpdate(req.params.id, {
      coverImage:         img.url,
      coverImagePublicId: img.publicId,
    });

    res.json({ success: true, image: img });
  } catch (e) { next(e); }
};

module.exports = { getGallery, addImages, reorderImages, deleteImage, setPrimary };
