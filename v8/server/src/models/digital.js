const mongoose = require('mongoose');

// ─── DigitalPurchase ──────────────────────────────────────────────────────────
// Created when a member completes payment for a PDF sale book.
const digitalPurchaseSchema = new mongoose.Schema({
  book:   { type: mongoose.Schema.Types.ObjectId, ref: 'Book',  required: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },

  // Payment info (store enough to reconcile; raw card data never stored)
  paymentProvider:  { type: String, default: 'stripe' },   // stripe | razorpay | manual
  paymentId:        { type: String },                       // provider transaction ID
  amountPaid:       { type: Number, required: true },
  currency:         { type: String, default: 'USD' },

  status: {
    type: String,
    enum: ['pending', 'completed', 'refunded', 'failed'],
    default: 'pending',
  },

  // Download tracking
  downloadCount:  { type: Number, default: 0 },
  maxDownloads:   { type: Number, default: 3 },   // configurable
  lastDownloadAt: { type: Date },

  // Cached watermarked copy on Cloudinary
  watermarkedPublicId: { type: String },  // Cloudinary public_id of watermarked PDF
  watermarkedKey:      { type: String },   // legacy S3 key (kept for backwards compat)

  completedAt: { type: Date },
}, { timestamps: true });

digitalPurchaseSchema.index({ book: 1, member: 1 });

// ─── ReadingSession (extended for Flipbook / TTS reader) ─────────────────────
const readingSessionSchema = new mongoose.Schema({
  book:        { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  member:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Position
  currentPage:     { type: Number, default: 1 },
  currentSentence: { type: Number, default: 0 },  // sentence index within page
  totalPages:      { type: Number },
  progress:        { type: Number, default: 0 },  // 0–100 %

  // TTS preferences persisted per-user
  ttsSpeed:  { type: Number, default: 1.0 },   // 0.5 – 2.0
  ttsVoice:  { type: String, default: '' },     // SpeechSynthesis voice name
  ttsEnabled:{ type: Boolean, default: false },

  // Timing
  totalReadingSeconds: { type: Number, default: 0 },  // cumulative seconds spent reading
  estimatedMinutes:    { type: Number },               // server-computed on upload
  lastReadAt:  { type: Date, default: Date.now },
  completed:   { type: Boolean, default: false },

  // Notes
  notes: [{ page: Number, text: String, createdAt: { type: Date, default: Date.now } }],
}, { timestamps: true });

readingSessionSchema.index({ book: 1, member: 1 }, { unique: true });

// ─── Bookmark ─────────────────────────────────────────────────────────────────
const bookmarkSchema = new mongoose.Schema({
  book:    { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  member:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  page:    { type: Number, required: true },
  label:   { type: String, default: '' },
  color:   { type: String, default: 'yellow' },
}, { timestamps: true });

bookmarkSchema.index({ book: 1, member: 1 });

// ─── ReadingContent cache ──────────────────────────────────────────────────────
// When admin uploads a text/PDF book, we extract text page-by-page and cache here
// so the reader can work offline (PWA) and do TTS sentence-by-sentence.
const readingContentSchema = new mongoose.Schema({
  book:        { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, unique: true },
  pages:       [{ pageNum: Number, text: String, wordCount: Number }],
  totalWords:  { type: Number, default: 0 },
  totalPages:  { type: Number, default: 0 },
  extractedAt: { type: Date },
  sourceType:  { type: String, enum: ['pdf', 'text', 'manual'], default: 'manual' },
}, { timestamps: true });

// ─── BookImage (gallery entries stored separately for easy reorder) ───────────
const bookImageSchema = new mongoose.Schema({
  book:  { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  url:   { type: String, required: true },   // path or S3 key
  label: { type: String, default: '' },      // "Back Cover", "Table of Contents", …
  order: { type: Number, default: 0 },
  isPrimary: { type: Boolean, default: false },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

bookImageSchema.index({ book: 1, order: 1 });

module.exports = {
  DigitalPurchase: mongoose.model('DigitalPurchase', digitalPurchaseSchema),
  ReadingSession:  mongoose.model('ReadingSession',  readingSessionSchema),
  Bookmark:        mongoose.model('Bookmark',        bookmarkSchema),
  ReadingContent:  mongoose.model('ReadingContent',  readingContentSchema),
  BookImage:       mongoose.model('BookImage',       bookImageSchema),
};
