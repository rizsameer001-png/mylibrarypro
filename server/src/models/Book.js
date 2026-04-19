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

  // E-Book fields
  isEbook: { type: Boolean, default: false },
  ebookFile: { type: String },
  ebookFormat: { type: String, enum: ['pdf', 'epub', null] },

  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  tags: [String],
  location: { type: String }, // Physical shelf location
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

bookSchema.index({ title: 'text', isbn: 'text', tags: 'text' });

bookSchema.virtual('availabilityStatus').get(function () {
  if (this.availableCopies > 0) return 'available';
  if (this.reservedCopies > 0) return 'reserved';
  return 'issued';
});

module.exports = mongoose.model('Book', bookSchema);
