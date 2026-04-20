const fs = require('fs');
const path = require('path');
const Book = require('../models/Book');
const { DigitalPurchase, ReadingSession } = require('../models/digital');

const {
  uploadToCloudinary,
  getCloudinarySignedUrl,
  getCloudinaryDownloadUrl
} = require('../utils/cloudinary');

const { sendEmail } = require('../utils/email');
const { logActivity } = require('../utils/activityLogger');


// ─────────────────────────────────────────────────────────────
// ADMIN: Upload Digital File
// ─────────────────────────────────────────────────────────────
const uploadDigitalFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const book = await Book.findById(req.params.bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.path, {
      folder: `ebooks/${req.params.bookId}`,
    });

    // Remove temp file
    fs.unlinkSync(req.file.path);

    // Optional: count pages (PDF only)
    let pageCount;
    try {
      if (result.format === 'pdf') {
        const { PDFDocument } = require('pdf-lib');
        const buffer = fs.readFileSync(req.file.path);
        const doc = await PDFDocument.load(buffer);
        pageCount = doc.getPageCount();
      }
    } catch {}

    // Save in DB
    await Book.findByIdAndUpdate(req.params.bookId, {
      isEbook: true,
      ebookFormat: result.format,
      // digitalFileKey: result.publicId,   // 🔥 IMPORTANT
      // digitalFileUrl: result.secureUrl,  // optional
      // digitalFileSize: result.bytes,
      cloudinaryPublicId: result.publicId,
      cloudinarySecureUrl: result.secureUrl,
      cloudinaryBytes: result.bytes,
      ...(pageCount ? { readingPageCount: pageCount } : {})
    });

    await logActivity(
      req.user._id,
      'UPLOAD_DIGITAL',
      `Uploaded digital file for book ${book.title}`,
      req.ip,
      'Digital'
    );

    res.json({
      success: true,
      file: result,
      pageCount
    });

  } catch (e) {
    next(e);
  }
};


// ─────────────────────────────────────────────────────────────
// ADMIN: Update Reading Settings
// ─────────────────────────────────────────────────────────────
const updateReadingSettings = async (req, res, next) => {
  try {
    const {
      readingEnabled,
      readingAccessLevel,
      isDigitalSale,
      digitalPrice,
      watermarkEnabled
    } = req.body;

    const book = await Book.findByIdAndUpdate(
      req.params.bookId,
      { readingEnabled, readingAccessLevel, isDigitalSale, digitalPrice, watermarkEnabled },
      { new: true }
    );

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    res.json({ success: true, book });

  } catch (e) {
    next(e);
  }
};


// ─────────────────────────────────────────────────────────────
// MEMBER: Read Book (Signed URL)
// ─────────────────────────────────────────────────────────────
const getReadUrl = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.bookId);

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    if (!book.readingEnabled) {
      return res.status(403).json({ success: false, message: 'Reading not enabled' });
    }

    if (!book.digitalFileKey) {
      return res.status(404).json({ success: false, message: 'Digital file not available' });
    }

    // Access control
    if (book.readingAccessLevel === 'premium') {
      const User = require('../models/User');
      const user = await User.findById(req.user._id).populate('membershipPlan');

      if (!user.membershipPlan?.ebookAccess) {
        return res.status(403).json({
          success: false,
          message: 'Premium membership required'
        });
      }
    }

    // 🔥 Generate signed URL
    const url = getCloudinarySignedUrl(book.digitalFileKey, 'raw');

    // Save reading session
    await ReadingSession.findOneAndUpdate(
      { book: book._id, member: req.user._id },
      {
        lastReadAt: new Date(),
        totalPages: book.readingPageCount
      },
      { upsert: true }
    );

    res.json({
      success: true,
      url,
      totalPages: book.readingPageCount || null
    });

  } catch (e) {
    next(e);
  }
};


// ─────────────────────────────────────────────────────────────
// MEMBER: Update Progress
// ─────────────────────────────────────────────────────────────
const updateProgress = async (req, res, next) => {
  try {
    const { currentPage, totalPages } = req.body;

    const progress = totalPages
      ? Math.round((currentPage / totalPages) * 100)
      : 0;

    const session = await ReadingSession.findOneAndUpdate(
      { book: req.params.bookId, member: req.user._id },
      {
        currentPage,
        totalPages,
        progress,
        lastReadAt: new Date(),
        completed: progress >= 100
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, session });

  } catch (e) {
    next(e);
  }
};


// ─────────────────────────────────────────────────────────────
// MEMBER: Purchase Book
// ─────────────────────────────────────────────────────────────
// const purchaseBook = async (req, res, next) => {
//   try {
//     const book = await Book.findById(req.params.bookId);

//     if (!book) {
//       return res.status(404).json({ success: false, message: 'Book not found' });
//     }

//     const existing = await DigitalPurchase.findOne({
//       book: book._id,
//       member: req.user._id,
//       status: 'completed'
//     });

//     if (existing) {
//       return res.status(409).json({ success: false, message: 'Already purchased' });
//     }

//     const purchase = await DigitalPurchase.create({
//       book: book._id,
//       member: req.user._id,
//       status: 'completed',
//       completedAt: new Date(),
//       maxDownloads: 5
//     });

//     const User = require('../models/User');
//     const user = await User.findById(req.user._id);

//     sendEmail({
//       to: user.email,
//       subject: `Purchase: ${book.title}`,
//       html: `<p>Thanks for purchasing ${book.title}</p>`
//     }).catch(console.error);

//     await logActivity(
//       req.user._id,
//       'PURCHASE_DIGITAL',
//       `Purchased ${book.title}`,
//       req.ip,
//       'Digital'
//     );

//     res.status(201).json({ success: true, purchase });

//   } catch (e) {
//     next(e);
//   }
// };

// ─────────────────────────────────────────────────────────────
// MEMBER: Purchase Book (FIXED)
// ─────────────────────────────────────────────────────────────
const purchaseBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.bookId);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // ❌ Block purchase for FREE books
    if (!book.isDigitalSale || book.digitalPrice === 0) {
      return res.status(400).json({
        success: false,
        message: 'This book is free. No purchase required.'
      });
    }

    // ❌ Prevent duplicate purchase
    const existing = await DigitalPurchase.findOne({
      book: book._id,
      member: req.user._id,
      status: 'completed'
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Already purchased'
      });
    }

    // ✅ (Optional) Payment validation placeholder
    const { paymentId, paymentProvider = 'manual' } = req.body;

    // TODO: verify payment with Stripe/Razorpay in production

    // ✅ Create purchase
    const purchase = await DigitalPurchase.create({
      book: book._id,
      member: req.user._id,
      paymentId: paymentId || 'manual',
      paymentProvider,
      amountPaid: book.digitalPrice,
      status: 'completed',
      completedAt: new Date(),
      maxDownloads: parseInt(process.env.MAX_DOWNLOADS || '5', 10)
    });

    // ✅ Send email
    const User = require('../models/User');
    const user = await User.findById(req.user._id);

    sendEmail({
      to: user.email,
      subject: `Purchase: ${book.title}`,
      html: `
        <p>Hi ${user.name},</p>
        <p>You successfully purchased <b>${book.title}</b>.</p>
        <p>You can now read or download it from your dashboard.</p>
      `
    }).catch(console.error);

    // ✅ Log
    await logActivity(
      req.user._id,
      'PURCHASE_DIGITAL',
      `Purchased ${book.title}`,
      req.ip,
      'Digital'
    );

    res.status(201).json({
      success: true,
      purchase
    });

  } catch (e) {
    next(e);
  }
};


// // ─────────────────────────────────────────────────────────────
// // MEMBER: Download Book
// // ─────────────────────────────────────────────────────────────
// const downloadBook = async (req, res, next) => {
//   try {
//     const book = await Book.findById(req.params.bookId);

//     // if (!book || !book.digitalFileKey) {
//     //   return res.status(404).json({ success: false, message: 'File not found' });
//     // }
//     // const url = getCloudinaryDownloadUrl(book.digitalFileKey, 'raw');

//     if (!book.cloudinaryPublicId) {
//         return res.status(404).json({ success: false, message: 'Digital file not available' });
//       }

//       const url = getCloudinarySignedUrl(book.cloudinaryPublicId, 'raw');

//     res.json({
//       success: true,
//       url
//     });

//   } catch (e) {
//     next(e);
//   }
// };

// ─────────────────────────────────────────────────────────────
// MEMBER: Download Book (FIXED)
// ─────────────────────────────────────────────────────────────
const downloadBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.bookId);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // ❌ No file
    if (!book.cloudinaryPublicId) {
      return res.status(404).json({
        success: false,
        message: 'Digital file not available'
      });
    }

    // ❌ Download disabled
    if (!book.downloadEnabled) {
      return res.status(403).json({
        success: false,
        message: 'Download not allowed for this book'
      });
    }

    // ── PAID BOOK LOGIC ─────────────────────────────
    if (book.isDigitalSale && book.digitalPrice > 0) {
      const purchase = await DigitalPurchase.findOne({
        book: book._id,
        member: req.user._id,
        status: 'completed'
      });

      if (!purchase) {
        return res.status(403).json({
          success: false,
          message: 'You must purchase this book first'
        });
      }

      // ❌ Limit exceeded
      if (purchase.downloadCount >= purchase.maxDownloads) {
        return res.status(403).json({
          success: false,
          message: 'Download limit reached'
        });
      }

      // ✅ Increment download count
      await DigitalPurchase.findByIdAndUpdate(purchase._id, {
        $inc: { downloadCount: 1 },
        lastDownloadAt: new Date()
      });
    }

    // ── GENERATE DOWNLOAD URL ───────────────────────
    const url = getCloudinaryDownloadUrl(
      book.cloudinaryPublicId,
      'raw'
    );

    res.json({
      success: true,
      url
    });

  } catch (e) {
    next(e);
  }
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
      {
        $push: { notes: { page, text } }
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, notes: session.notes });

  } catch (e) {
    next(e);
  }
};


// ─────────────────────────────────────────────────────────────
// MEMBER: My Purchases
// ─────────────────────────────────────────────────────────────
const myPurchases = async (req, res, next) => {
  try {
    const purchases = await DigitalPurchase.find({
      member: req.user._id,
      status: 'completed'
    }).populate('book', 'title coverImage');

    res.json({ success: true, purchases });

  } catch (e) {
    next(e);
  }
};


// ─────────────────────────────────────────────────────────────
// MEMBER: My Reading Sessions
// ─────────────────────────────────────────────────────────────
const myReadingSessions = async (req, res, next) => {
  try {
    const sessions = await ReadingSession.find({
      member: req.user._id
    }).populate('book', 'title coverImage');

    res.json({ success: true, sessions });

  } catch (e) {
    next(e);
  }
};


module.exports = {
  uploadDigitalFile,
  updateReadingSettings,
  getReadUrl,
  updateProgress,
  addNote, // ✅ ADD THIS
  purchaseBook,
  downloadBook,
  myPurchases,
  myReadingSessions
};