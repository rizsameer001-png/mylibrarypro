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

  // Optional: watermarked file cached on S3
  watermarkedKey: { type: String },   // S3 key of the user-specific PDF

  completedAt: { type: Date },
}, { timestamps: true });

digitalPurchaseSchema.index({ book: 1, member: 1 });

// ─── ReadingSession ───────────────────────────────────────────────────────────
// Tracks where a user is in an in-browser read.
const readingSessionSchema = new mongoose.Schema({
  book:        { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  member:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currentPage: { type: Number, default: 1 },
  totalPages:  { type: Number },
  progress:    { type: Number, default: 0 },  // 0–100 %
  lastReadAt:  { type: Date, default: Date.now },
  completed:   { type: Boolean, default: false },
  notes:       [{ page: Number, text: String, createdAt: { type: Date, default: Date.now } }],
}, { timestamps: true });

readingSessionSchema.index({ book: 1, member: 1 }, { unique: true });

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
  BookImage:       mongoose.model('BookImage',       bookImageSchema),
};
