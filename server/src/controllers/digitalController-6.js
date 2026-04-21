/**
 * digitalController.js
 * Handles: digital file upload (Cloudinary), reading access, purchases, downloads, progress tracking
 */
const fs   = require('fs');
const path = require('path');
const Book = require('../models/Book');
const { DigitalPurchase, ReadingSession } = require('../models/digital');
const {
  uploadToCloudinary,
  getCloudinarySignedUrl,
  getCloudinaryDownloadUrl,
  getCloudinaryBuffer,
  deleteFromCloudinary,
} = require('../utils/cloudinary');
const { watermarkPdf }    = require('../utils/storage');
const { sendEmail }       = require('../utils/email');
const { logActivity }     = require('../utils/activityLogger');

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN: upload digital file to Cloudinary
//  POST /api/digital/:bookId/upload
// ─────────────────────────────────────────────────────────────────────────────
const uploadDigitalFile = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const book = await Book.findById(req.params.bookId);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });

    // Delete old Cloudinary file if exists
    if (book.cloudinaryPublicId) {
      await deleteFromCloudinary(book.cloudinaryPublicId, 'raw').catch(() => {});
    }

    const ext      = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    const result   = await uploadToCloudinary(req.file.path, {
      folder:       'lms/ebooks',
      resourceType: 'raw',
    });

    // Cleanup temp file
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    // Count PDF pages optionally
    let pageCount;
    try {
      const { PDFDocument } = require('pdf-lib');
      const buf = fs.readFileSync(req.file.path);
      pageCount = (await PDFDocument.load(buf)).getPageCount();
    } catch {}

    await Book.findByIdAndUpdate(req.params.bookId, {
      isEbook:             true,
      ebookFormat:         ext,
      cloudinaryPublicId:  result.publicId,
      cloudinarySecureUrl: result.secureUrl,
      cloudinaryBytes:     result.bytes,
      ...(pageCount ? { readingPageCount: pageCount } : {}),
    });

    await logActivity(req.user._id, 'UPLOAD_DIGITAL', `Uploaded file for "${book.title}"`, req.ip, 'Digital');
    res.json({ success: true, publicId: result.publicId, secureUrl: result.secureUrl, pageCount });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN: update reading/download/sale settings
//  PUT /api/digital/:bookId/reading-settings
// ─────────────────────────────────────────────────────────────────────────────
const updateReadingSettings = async (req, res, next) => {
  try {
    const fields = ['readingEnabled', 'readingAccessLevel', 'isDigitalSale', 'digitalPrice', 'watermarkEnabled', 'downloadEnabled'];
    const update = {};
    fields.forEach(f => { if (f in req.body) update[f] = req.body[f]; });

    const book = await Book.findByIdAndUpdate(req.params.bookId, update, { new: true });
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    res.json({ success: true, book });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  MEMBER: get signed Cloudinary URL for in-browser reading
//  GET /api/digital/:bookId/read
// ─────────────────────────────────────────────────────────────────────────────
const getReadUrl = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });

    if (!book.readingEnabled) {
      return res.status(403).json({ success: false, message: 'Online reading is not enabled for this book' });
    }
    if (!book.cloudinaryPublicId && !book.ebookFile) {
      return res.status(404).json({ success: false, message: 'Digital file not yet uploaded' });
    }

    // Access level check
    if (book.readingAccessLevel === 'premium') {
      const User = require('../models/User');
      const user = await User.findById(req.user._id).populate('membershipPlan');
      if (!user?.membershipPlan?.ebookAccess) {
        return res.status(403).json({ success: false, message: 'Premium membership required' });
      }
    }

    // Build URL — Cloudinary (signed) or legacy local path
    let url;
    if (book.cloudinaryPublicId) {
      url = getCloudinarySignedUrl(book.cloudinaryPublicId, 'raw');
    } else {
      url = `/${book.ebookFile}`;
    }

    // Upsert reading session
    await ReadingSession.findOneAndUpdate(
      { book: book._id, member: req.user._id },
      { lastReadAt: new Date(), totalPages: book.readingPageCount },
      { upsert: true, setDefaultsOnInsert: true },
    );

    res.json({ success: true, url, totalPages: book.readingPageCount || null });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  MEMBER: save reading progress
//  PUT /api/digital/:bookId/progress
// ─────────────────────────────────────────────────────────────────────────────
const updateProgress = async (req, res, next) => {
  try {
    const { currentPage, totalPages } = req.body;
    const progress = totalPages ? Math.round((currentPage / totalPages) * 100) : 0;
    const session  = await ReadingSession.findOneAndUpdate(
      { book: req.params.bookId, member: req.user._id },
      { currentPage, totalPages, progress, lastReadAt: new Date(), completed: progress >= 100 },
      { upsert: true, new: true },
    );
    res.json({ success: true, session });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  MEMBER: add a reading note
//  POST /api/digital/:bookId/notes
// ─────────────────────────────────────────────────────────────────────────────
const addNote = async (req, res, next) => {
  try {
    const { page, text } = req.body;
    const session = await ReadingSession.findOneAndUpdate(
      { book: req.params.bookId, member: req.user._id },
      { $push: { notes: { page, text } } },
      { upsert: true, new: true },
    );
    res.json({ success: true, notes: session.notes });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  MEMBER: purchase a digital book
//  POST /api/digital/:bookId/purchase
// ─────────────────────────────────────────────────────────────────────────────
const purchaseBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book)            return res.status(404).json({ success: false, message: 'Book not found' });
    if (!book.isDigitalSale) return res.status(400).json({ success: false, message: 'Not available for purchase' });

    // Idempotency
    const existing = await DigitalPurchase.findOne({ book: book._id, member: req.user._id, status: 'completed' });
    if (existing) return res.status(409).json({ success: false, message: 'Already purchased', purchase: existing });

    const { paymentId, paymentProvider = 'stripe', amountPaid, currency = 'USD' } = req.body;

    const purchase = await DigitalPurchase.create({
      book:         book._id,
      member:       req.user._id,
      paymentProvider,
      paymentId,
      amountPaid:   amountPaid || book.digitalPrice,
      currency,
      status:       'completed',
      completedAt:  new Date(),
      maxDownloads: parseInt(process.env.MAX_DOWNLOADS || '5', 10),
    });

    // Delivery email
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    sendEmail({
      to:      user.email,
      subject: `Your purchase: ${book.title}`,
      html:    `<p>Hi ${user.name},</p>
                <p>Thank you for purchasing <b>${book.title}</b>!
                You can now read it online or download it from <b>My Downloads</b>.</p>
                <p>Downloads available: <b>${purchase.maxDownloads}</b></p>`,
    }).catch(console.error);

    await logActivity(req.user._id, 'PURCHASE_DIGITAL', `Purchased "${book.title}"`, req.ip, 'Digital');
    res.status(201).json({ success: true, purchase });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  MEMBER: get a signed download URL (with optional watermark)
//  GET /api/digital/:bookId/download
// ─────────────────────────────────────────────────────────────────────────────
const downloadBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });

    if (!book.cloudinaryPublicId && !book.ebookFile) {
      return res.status(404).json({ success: false, message: 'No digital file available' });
    }

    // Paid gate
    if (book.isDigitalSale) {
      const purchase = await DigitalPurchase.findOne({ book: book._id, member: req.user._id, status: 'completed' });
      if (!purchase) return res.status(403).json({ success: false, message: 'Purchase required' });
      if (purchase.downloadCount >= purchase.maxDownloads) {
        return res.status(403).json({ success: false, message: 'Download limit reached' });
      }

      // Watermark flow
      let publicId = book.cloudinaryPublicId;
      if (book.watermarkEnabled && book.ebookFormat === 'pdf' && book.cloudinaryPublicId) {
        if (!purchase.watermarkedPublicId) {
          const User      = require('../models/User');
          const user      = await User.findById(req.user._id);
          const tmpIn     = path.join('/tmp', `orig_${Date.now()}.pdf`);
          const tmpOut    = path.join('/tmp', `wm_${Date.now()}.pdf`);

          // Download original
          const origBuffer = await getCloudinaryBuffer(book.cloudinaryPublicId, 'raw');
          fs.writeFileSync(tmpIn, origBuffer);

          // Watermark
          const wmBuffer = await watermarkPdf(origBuffer, user.email);
          fs.writeFileSync(tmpOut, wmBuffer);

          // Upload watermarked version
          const wmResult = await uploadToCloudinary(tmpOut, { folder: 'lms/watermarked', resourceType: 'raw' });

          // Cleanup
          [tmpIn, tmpOut].forEach(f => { try { fs.unlinkSync(f); } catch {} });

          await DigitalPurchase.findByIdAndUpdate(purchase._id, { watermarkedPublicId: wmResult.publicId });
          publicId = wmResult.publicId;
        } else {
          publicId = purchase.watermarkedPublicId;
        }
      }

      // Increment download count
      await DigitalPurchase.findByIdAndUpdate(purchase._id, {
        $inc: { downloadCount: 1 },
        lastDownloadAt: new Date(),
      });

      const url     = getCloudinaryDownloadUrl(publicId, 'raw');
      const expires = parseInt(process.env.CLOUDINARY_SIGNED_URL_EXPIRES || '300', 10);
      return res.json({ success: true, url, expiresIn: expires });
    }

    // Free downloadable book
    if (!book.downloadEnabled) {
      return res.status(403).json({ success: false, message: 'Download not enabled for this book' });
    }

    const url     = book.cloudinaryPublicId
      ? getCloudinaryDownloadUrl(book.cloudinaryPublicId, 'raw')
      : `/${book.ebookFile}`;
    const expires = parseInt(process.env.CLOUDINARY_SIGNED_URL_EXPIRES || '300', 10);
    res.json({ success: true, url, expiresIn: expires });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  MEMBER: list my purchases
//  GET /api/digital/my-purchases
// ─────────────────────────────────────────────────────────────────────────────
const myPurchases = async (req, res, next) => {
  try {
    const purchases = await DigitalPurchase
      .find({ member: req.user._id, status: 'completed' })
      .populate('book', 'title coverImage authors ebookFormat digitalPrice cloudinaryPublicId')
      .sort('-completedAt');
    res.json({ success: true, purchases });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  MEMBER: list my reading sessions
//  GET /api/digital/my-reading
// ─────────────────────────────────────────────────────────────────────────────
const myReadingSessions = async (req, res, next) => {
  try {
    const sessions = await ReadingSession
      .find({ member: req.user._id })
      .populate('book', 'title coverImage authors readingPageCount readingEnabled')
      .sort('-lastReadAt');
    res.json({ success: true, sessions });
  } catch (e) { next(e); }
};

module.exports = {
  uploadDigitalFile,
  updateReadingSettings,
  getReadUrl,
  updateProgress,
  addNote,
  purchaseBook,
  downloadBook,
  myPurchases,
  myReadingSessions,
};
