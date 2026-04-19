const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  // ── Core metadata ──────────────────────────────────────────────────────────
  title:           { type: String, required: true, trim: true },
  isbn:            { type: String, unique: true, sparse: true, trim: true },
  description:     { type: String },
  authors:         [{ type: mongoose.Schema.Types.ObjectId, ref: 'Author' }],
  categories:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  publisher:       { type: mongoose.Schema.Types.ObjectId, ref: 'Publisher' },
  language:        { type: String, default: 'English' },
  series:          { type: String },
  edition:         { type: String },
  publicationYear: { type: Number },
  pages:           { type: Number },
  tags:            [String],
  location:        { type: String },
  addedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:          { type: String, enum: ['active', 'inactive'], default: 'active' },

  // ── Book type ──────────────────────────────────────────────────────────────
  bookType: { type: String, enum: ['physical', 'digital', 'both'], default: 'physical' },

  // ── Physical copy tracking ─────────────────────────────────────────────────
  totalCopies:     { type: Number, default: 1, min: 0 },
  availableCopies: { type: Number, default: 1, min: 0 },
  reservedCopies:  { type: Number, default: 0, min: 0 },

  // ── Cover image ────────────────────────────────────────────────────────────
  coverImage:         { type: String },
  coverImagePublicId: { type: String },

  // ── Gallery ────────────────────────────────────────────────────────────────
  gallery: [{
    url:       { type: String, required: true },
    publicId:  { type: String },
    label:     { type: String, default: '' },
    order:     { type: Number, default: 0 },
    isPrimary: { type: Boolean, default: false },
    _id:       false,
  }],

  // ── Digital file (Cloudinary) ──────────────────────────────────────────────
  isEbook:              { type: Boolean, default: false },
  ebookFormat:          { type: String, enum: ['pdf', 'epub', 'mobi', null], default: null },
  cloudinaryPublicId:   { type: String },
  cloudinarySecureUrl:  { type: String },
  cloudinaryBytes:      { type: Number },
  ebookFile:            { type: String },   // legacy local path

  // ── Digital access ─────────────────────────────────────────────────────────
  readingEnabled:     { type: Boolean, default: false },
  readingAccessLevel: { type: String, enum: ['any', 'member', 'premium'], default: 'member' },
  readingPageCount:   { type: Number },
  downloadEnabled:    { type: Boolean, default: false },

  // ── Digital sale ───────────────────────────────────────────────────────────
  isDigitalSale:    { type: Boolean, default: false },
  digitalPrice:     { type: Number, default: 0 },
  watermarkEnabled: { type: Boolean, default: true },

}, { timestamps: true });

bookSchema.index({ title: 'text', isbn: 'text', tags: 'text' });

bookSchema.virtual('availabilityStatus').get(function () {
  if (this.availableCopies > 0) return 'available';
  if (this.reservedCopies  > 0) return 'reserved';
  return 'issued';
});

module.exports = mongoose.model('Book', bookSchema);
