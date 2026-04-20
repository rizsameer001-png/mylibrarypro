const fs   = require('fs');
const path = require('path');
const Book = require('../models/Book');
const { DigitalPurchase, ReadingSession } = require('../models/digital');
// const { getSignedUrl, uploadToS3, watermarkPdf } = require('../utils/storage');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { sendEmail } = require('../utils/email');
const { logActivity } = require('../utils/activityLogger');

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN: upload the digital PDF file to S3 / local store
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/digital/:bookId/upload
const uploadDigitalFile = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const book = await Book.findById(req.params.bookId);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });

    const buffer   = fs.readFileSync(req.file.path);
    const ext      = path.extname(req.file.originalname).toLowerCase();
    const s3Key    = `ebooks/${req.params.bookId}/${Date.now()}${ext}`;
    const mimeType = ext === '.pdf' ? 'application/pdf' : 'application/epub+zip';

    await uploadToS3(buffer, s3Key, mimeType);

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    // Attempt to count PDF pages (optional, needs pdf-lib)
    let pageCount;
    try {
      const { PDFDocument } = require('pdf-lib');
      const doc = await PDFDocument.load(buffer);
      pageCount = doc.getPageCount();
    } catch { /* pdf-lib not installed — skip */ }

    await Book.findByIdAndUpdate(req.params.bookId, {
      isEbook:        true,
      ebookFormat:    ext.replace('.', ''),
      digitalFileKey: s3Key,
      digitalFileSize: buffer.length,
      ...(pageCount ? { readingPageCount: pageCount } : {}),
    });

    await logActivity(req.user._id, 'UPLOAD_DIGITAL', `Uploaded digital file for book ${book.title}`, req.ip, 'Digital');
    res.json({ success: true, s3Key, pageCount });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN: toggle reading-access settings
// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/digital/:bookId/reading-settings
const updateReadingSettings = async (req, res, next) => {
  try {
    const { readingEnabled, readingAccessLevel, isDigitalSale, digitalPrice, watermarkEnabled, maxDownloads } = req.body;
    const book = await Book.findByIdAndUpdate(
      req.params.bookId,
      { readingEnabled, readingAccessLevel, isDigitalSale, digitalPrice, watermarkEnabled },
      { new: true },
    );
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    res.json({ success: true, book });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  MEMBER: check reading permission & get signed URL for in-browser reader
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/digital/:bookId/read
const getReadUrl = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    if (!book.readingEnabled) {
      return res.status(403).json({ success: false, message: 'Online reading is not enabled for this book' });
    }
    if (!book.digitalFileKey) {
      return res.status(404).json({ success: false, message: 'Digital file not available' });
    }

    // Access-level gate
    const level = book.readingAccessLevel || 'member';
    if (level === 'premium') {
      // Check that user has an active premium membership
      const User = require('../models/User');
      const { MembershipPlan } = require('../models/index');
      const user = await User.findById(req.user._id).populate('membershipPlan');
      if (!user.membershipPlan?.ebookAccess) {
        return res.status(403).json({ success: false, message: 'Premium membership required to read this book online' });
      }
    }

    const url = await getSignedUrl(book.digitalFileKey);

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
//  MEMBER: update reading progress
// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/digital/:bookId/progress
const updateProgress = async (req, res, next) => {
  try {
    const { currentPage, totalPages } = req.body;
    const progress = totalPages ? Math.round((currentPage / totalPages) * 100) : 0;

    const session = await ReadingSession.findOneAndUpdate(
      { book: req.params.bookId, member: req.user._id },
      {
        currentPage,
        totalPages,
        progress,
        lastReadAt: new Date(),
        completed:  progress >= 100,
      },
      { upsert: true, new: true },
    );
    res.json({ success: true, session });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  MEMBER: add a reading note
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/digital/:bookId/notes
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
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/digital/:bookId/purchase
const purchaseBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    if (!book.isDigitalSale) return res.status(400).json({ success: false, message: 'This book is not available for purchase' });

    // Idempotency: don't double-charge
    const existing = await DigitalPurchase.findOne({ book: book._id, member: req.user._id, status: 'completed' });
    if (existing) return res.status(409).json({ success: false, message: 'Already purchased', purchase: existing });

    const { paymentId, paymentProvider = 'stripe', amountPaid, currency = 'USD' } = req.body;

    // In a real implementation you'd verify the payment server-side with Stripe/Razorpay here.
    // For now we trust the client-provided paymentId (replace with webhook logic).

    const purchase = await DigitalPurchase.create({
      book:            book._id,
      member:          req.user._id,
      paymentProvider,
      paymentId,
      amountPaid:      amountPaid || book.digitalPrice,
      currency,
      status:          'completed',
      completedAt:     new Date(),
      maxDownloads:    parseInt(process.env.MAX_DOWNLOADS || '5', 10),
    });

    // Send delivery email
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    sendEmail({
      to:      user.email,
      subject: `Your purchase: ${book.title}`,
      html:    `<p>Hi ${user.name},</p>
                <p>Thank you for purchasing <b>${book.title}</b>! 
                   You can now download or read it online from your <b>My Downloads</b> section.</p>
                <p>You have up to <b>${purchase.maxDownloads}</b> downloads available.</p>`,
    }).catch(console.error);

    await logActivity(req.user._id, 'PURCHASE_DIGITAL', `Purchased "${book.title}"`, req.ip, 'Digital');
    res.status(201).json({ success: true, purchase });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  MEMBER: request a signed download URL (with optional watermark)
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/digital/:bookId/download
const downloadBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    if (!book.digitalFileKey) return res.status(404).json({ success: false, message: 'No digital file' });

    // Must have purchased (if it's a paid product)
    if (book.isDigitalSale) {
      const purchase = await DigitalPurchase.findOne({
        book:   book._id,
        member: req.user._id,
        status: 'completed',
      });
      if (!purchase) return res.status(403).json({ success: false, message: 'Purchase required' });
      if (purchase.downloadCount >= purchase.maxDownloads) {
        return res.status(403).json({ success: false, message: 'Download limit reached' });
      }

      // Watermark & serve
      let fileKey = book.digitalFileKey;
      if (book.watermarkEnabled && book.ebookFormat === 'pdf') {
        // Check if we already cached a watermarked version for this user
        if (!purchase.watermarkedKey) {
          const User = require('../models/User');
          const user = await User.findById(req.user._id);

          // Fetch original from storage
          const { getObjectBuffer } = require('../utils/storage');
          const originalBuffer = await getObjectBuffer(book.digitalFileKey);
          const watermarked    = await watermarkPdf(originalBuffer, user.email);

          const wKey = `ebooks/${book._id}/wm_${req.user._id}.pdf`;
          await uploadToS3(watermarked, wKey, 'application/pdf');
          await DigitalPurchase.findByIdAndUpdate(purchase._id, { watermarkedKey: wKey });
          fileKey = wKey;
        } else {
          fileKey = purchase.watermarkedKey;
        }
      }

      // Increment counter
      await DigitalPurchase.findByIdAndUpdate(purchase._id, {
        $inc: { downloadCount: 1 },
        lastDownloadAt: new Date(),
      });

      const url = await getSignedUrl(fileKey);
      return res.json({ success: true, url, expiresIn: parseInt(process.env.SIGNED_URL_EXPIRES_SECONDS || '300') });
    }

    // Free ebook — still use signed URL for consistency
    const url = await getSignedUrl(book.digitalFileKey);
    res.json({ success: true, url, expiresIn: 300 });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  MEMBER: my purchases list
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/digital/my-purchases
const myPurchases = async (req, res, next) => {
  try {
    const purchases = await DigitalPurchase.find({ member: req.user._id, status: 'completed' })
      .populate('book', 'title coverImage authors ebookFormat digitalPrice')
      .sort('-completedAt');
    res.json({ success: true, purchases });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
//  MEMBER: my reading sessions
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/digital/my-reading
const myReadingSessions = async (req, res, next) => {
  try {
    const sessions = await ReadingSession.find({ member: req.user._id })
      .populate('book', 'title coverImage authors readingPageCount')
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
