/**
 * galleryController.js
 * All images are already on Cloudinary — client sends secureUrl + publicId.
 * No files are written to disk.
 */
const Book = require('../models/Book');
const { BookImage }            = require('../models/digital');
const { deleteFromCloudinary } = require('../utils/cloudinary');

const PLACEHOLDER = '/no-cover.svg';

// GET /api/books/:id/gallery
const getGallery = async (req, res, next) => {
  try {
    const images = await BookImage.find({ book: req.params.id }).sort('order');
    res.json({ success: true, images, placeholder: PLACEHOLDER });
  } catch (e) { next(e); }
};

// POST /api/books/:id/gallery/add-url  — save a single already-uploaded URL
const addImageUrl = async (req, res, next) => {
  try {
    const { url, publicId = '', label = '', order, isPrimary } = req.body;
    if (!url) return res.status(400).json({ success: false, message: 'url is required' });

    const existing = await BookImage.countDocuments({ book: req.params.id });
    const isFirst  = existing === 0;

    const image = await BookImage.create({
      book:       req.params.id,
      url,
      publicId,
      label,
      order:      order !== undefined ? order : existing,
      isPrimary:  isPrimary !== undefined ? isPrimary : isFirst,
      uploadedBy: req.user._id,
    });

    // Sync primary cover to Book
    if (image.isPrimary) {
      await Book.findByIdAndUpdate(req.params.id, { coverImage: url, coverImagePublicId: publicId });
    }

    res.status(201).json({ success: true, image });
  } catch (e) { next(e); }
};

// PUT /api/books/:id/gallery/reorder
const reorderImages = async (req, res, next) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, message: 'order must be an array' });
    }
    await BookImage.updateMany({ book: req.params.id }, { isPrimary: false });
    for (const item of order) {
      const upd = { order: item.order, isPrimary: !!item.isPrimary };
      if (item.label !== undefined) upd.label = item.label;
      await BookImage.findByIdAndUpdate(item._id, upd);
    }
    const primary = await BookImage.findOne({ book: req.params.id, isPrimary: true });
    if (primary) {
      await Book.findByIdAndUpdate(req.params.id, { coverImage: primary.url, coverImagePublicId: primary.publicId });
    }
    const images = await BookImage.find({ book: req.params.id }).sort('order');
    res.json({ success: true, images });
  } catch (e) { next(e); }
};

// DELETE /api/books/:id/gallery/:imageId
const deleteImage = async (req, res, next) => {
  try {
    const img = await BookImage.findOneAndDelete({ _id: req.params.imageId, book: req.params.id });
    if (!img) return res.status(404).json({ success: false, message: 'Image not found' });

    if (img.publicId) await deleteFromCloudinary(img.publicId, 'image').catch(() => {});

    if (img.isPrimary) {
      const next_ = await BookImage.findOne({ book: req.params.id }).sort('order');
      if (next_) {
        next_.isPrimary = true;
        await next_.save();
        await Book.findByIdAndUpdate(req.params.id, { coverImage: next_.url, coverImagePublicId: next_.publicId });
      } else {
        await Book.findByIdAndUpdate(req.params.id, { coverImage: null, coverImagePublicId: null });
      }
    }
    res.json({ success: true, message: 'Image deleted' });
  } catch (e) { next(e); }
};

// PUT /api/books/:id/gallery/:imageId/primary
const setPrimary = async (req, res, next) => {
  try {
    await BookImage.updateMany({ book: req.params.id }, { isPrimary: false });
    const img = await BookImage.findByIdAndUpdate(req.params.imageId, { isPrimary: true }, { new: true });
    if (!img) return res.status(404).json({ success: false, message: 'Image not found' });
    await Book.findByIdAndUpdate(req.params.id, { coverImage: img.url, coverImagePublicId: img.publicId });
    res.json({ success: true, image: img });
  } catch (e) { next(e); }
};

module.exports = { getGallery, addImageUrl, reorderImages, deleteImage, setPrimary };
