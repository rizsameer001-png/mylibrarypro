const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  isbn: { type: String, unique: true, sparse: true, trim: true },
  description: { type: String },
  authors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Author' }],
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  publisher: { type: mongoose.Schema.Types.ObjectId, ref: 'Publisher' },
  language: { type: String, default: 'English' },
  series: { type: String },
  edition: { type: String },
  publicationYear: { type: Number },
  pages: { type: Number },
  coverImage: { type: String },
  totalCopies: { type: Number, default: 1, min: 0 },
  availableCopies: { type: Number, default: 1, min: 0 },
  reservedCopies: { type: Number, default: 0, min: 0 },

  // Cover gallery — multiple images with ordering
  coverImage: { type: String },           // primary cover (kept for backwards compat)
  gallery: [
    {
      url:     { type: String, required: true },
      label:   { type: String, default: '' },   // e.g. "Back Cover", "Table of Contents"
      order:   { type: Number, default: 0 },
      _id:     false,
    },
  ],

  // E-Book / Digital Product fields
  isEbook:      { type: Boolean, default: false },
  ebookFile:    { type: String },   // local path (free-access mode)
  ebookFormat:  { type: String, enum: ['pdf', 'epub', null] },

  // Digital-sale fields (S3 / GCS)
  isDigitalSale:      { type: Boolean, default: false },   // paid PDF download
  digitalFileKey:     { type: String },   // S3 object key
  digitalFileSize:    { type: Number },   // bytes
  digitalPrice:       { type: Number, default: 0 },
  watermarkEnabled:   { type: Boolean, default: true },

  // In-browser reading
  readingEnabled:     { type: Boolean, default: false },  // admin toggle
  readingAccessLevel: {
    type: String,
    enum: ['any', 'member', 'premium'],   // who may read online
    default: 'member',
  },
  readingPageCount:   { type: Number },   // total pages (set on upload)

  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  tags: [String],
  location: { type: String },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

bookSchema.index({ title: 'text', isbn: 'text', tags: 'text' });

bookSchema.virtual('availabilityStatus').get(function () {
  if (this.availableCopies > 0) return 'available';
  if (this.reservedCopies > 0) return 'reserved';
  return 'issued';
});

module.exports = mongoose.model('Book', bookSchema);
