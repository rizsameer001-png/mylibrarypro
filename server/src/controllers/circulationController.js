// const Circulation = require('../models/Circulation');
// const Book = require('../models/Book');
// const User = require('../models/User');
// const { SystemSettings, PenaltyRule } = require('../models/index');
// const { sendEmail } = require('../utils/email');
// const { logActivity } = require('../utils/activityLogger');
// const moment = require('moment');

// // @desc    Issue book to member
// // @route   POST /api/circulation/issue
// // @access  Admin/Manager
// const issueBook = async (req, res, next) => {
//   try {
//     const { bookId, memberId } = req.body;

//     const settings = await SystemSettings.findOne() || { issueDays: 14 };
//     const book = await Book.findById(bookId);
//     const member = await User.findById(memberId).populate('membershipPlan');

//     if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
//     if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
//     if (book.availableCopies < 1) return res.status(400).json({ success: false, message: 'No copies available' });

//     // Check if member already has this book issued
//     const existing = await Circulation.findOne({ book: bookId, member: memberId, status: 'active', type: 'issue' });
//     if (existing) return res.status(400).json({ success: false, message: 'Member already has this book issued' });

//     const dueDate = moment().add(settings.issueDays || 14, 'days').toDate();

//     const circulation = await Circulation.create({
//       book: bookId,
//       member: memberId,
//       issuedBy: req.user._id,
//       type: 'issue',
//       status: 'active',
//       issueDate: new Date(),
//       dueDate,
//     });

//     // Update book availability
//     book.availableCopies -= 1;
//     await book.save();

//     // Update member issued count
//     await User.findByIdAndUpdate(memberId, { $inc: { booksIssued: 1 } });

//     // Send email notification
//     sendEmail({
//       to: member.email,
//       subject: `Book Issued: ${book.title}`,
//       html: `<p>Dear ${member.name}, the book <b>${book.title}</b> has been issued to you. Due date: <b>${moment(dueDate).format('MMM DD, YYYY')}</b>.</p>`,
//     }).catch(console.error);

//     await logActivity(req.user._id, 'ISSUE_BOOK', `Issued "${book.title}" to ${member.name}`, req.ip, 'Circulation');

//     const result = await Circulation.findById(circulation._id)
//       .populate('book', 'title coverImage isbn')
//       .populate('member', 'name email');

//     res.status(201).json({ success: true, circulation: result });
//   } catch (error) { next(error); }
// };

// // @desc    Return book
// // @route   PUT /api/circulation/return/:id
// // @access  Admin/Manager
// const returnBook = async (req, res, next) => {
//   try {
//     const circulation = await Circulation.findById(req.params.id)
//       .populate('book')
//       .populate('member');

//     if (!circulation) return res.status(404).json({ success: false, message: 'Circulation record not found' });
//     if (circulation.status !== 'active' && circulation.status !== 'overdue') {
//       return res.status(400).json({ success: false, message: 'Book is not currently issued' });
//     }

//     const penaltyRule = await PenaltyRule.findOne() || { perDayFine: 1, gracePeriodDays: 0 };
//     const returnDate = new Date();
//     let fine = 0;

//     if (moment(returnDate).isAfter(circulation.dueDate)) {
//       const daysLate = moment(returnDate).diff(moment(circulation.dueDate), 'days');
//       const billableDays = Math.max(0, daysLate - (penaltyRule.gracePeriodDays || 0));
//       fine = billableDays * (penaltyRule.perDayFine || 1);
//       if (penaltyRule.maxFineAmount) fine = Math.min(fine, penaltyRule.maxFineAmount);
//     }

//     circulation.status = 'returned';
//     circulation.returnDate = returnDate;
//     circulation.returnedBy = req.user._id;
//     circulation.fine = fine;
//     await circulation.save();

//     // Restore book availability
//     circulation.book.availableCopies += 1;
//     await circulation.book.save();

//     if (fine > 0) {
//       await User.findByIdAndUpdate(circulation.member._id, { $inc: { totalFines: fine } });
//     }

//     await logActivity(req.user._id, 'RETURN_BOOK', `Returned "${circulation.book.title}" from ${circulation.member.name}`, req.ip, 'Circulation');
//     res.json({ success: true, circulation, fine });
//   } catch (error) { next(error); }
// };

// // @desc    Reserve book
// // @route   POST /api/circulation/reserve
// // @access  Private (member/admin/manager)
// const reserveBook = async (req, res, next) => {
//   try {
//     const { bookId } = req.body;
//     const memberId = req.user.role === 'member' ? req.user._id : req.body.memberId;

//     const settings = await SystemSettings.findOne() || { reserveDays: 3 };
//     const book = await Book.findById(bookId);

//     if (!book) return res.status(404).json({ success: false, message: 'Book not found' });

//     const alreadyReserved = await Circulation.findOne({ book: bookId, member: memberId, status: 'reserved' });
//     if (alreadyReserved) return res.status(400).json({ success: false, message: 'Already reserved' });

//     const reservationExpiry = moment().add(settings.reserveDays || 3, 'days').toDate();
//     const circulation = await Circulation.create({
//       book: bookId,
//       member: memberId,
//       type: 'reservation',
//       status: 'reserved',
//       reservationDate: new Date(),
//       reservationExpiry,
//     });

//     book.reservedCopies += 1;
//     await book.save();

//     await logActivity(memberId, 'RESERVE_BOOK', `Reserved "${book.title}"`, req.ip, 'Circulation');
//     const result = await Circulation.findById(circulation._id)
//       .populate('book', 'title coverImage isbn')
//       .populate('member', 'name email');

//     res.status(201).json({ success: true, circulation: result });
//   } catch (error) { next(error); }
// };

// // @desc    Cancel reservation
// // @route   PUT /api/circulation/reserve/:id/cancel
// // @access  Private
// const cancelReservation = async (req, res, next) => {
//   try {
//     const circulation = await Circulation.findById(req.params.id).populate('book');
//     if (!circulation) return res.status(404).json({ success: false, message: 'Reservation not found' });

//     // Members can only cancel their own; admin/manager can cancel any
//     if (req.user.role === 'member' && circulation.member.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ success: false, message: 'Not authorized' });
//     }

//     circulation.status = 'cancelled';
//     await circulation.save();

//     circulation.book.reservedCopies = Math.max(0, circulation.book.reservedCopies - 1);
//     await circulation.book.save();

//     res.json({ success: true, message: 'Reservation cancelled' });
//   } catch (error) { next(error); }
// };

// // @desc    Get circulation history
// // @route   GET /api/circulation
// // @access  Admin/Manager
// const getCirculations = async (req, res, next) => {
//   try {
//     const { type, status, memberId, bookId, page = 1, limit = 20 } = req.query;
//     const query = {};
//     if (type) query.type = type;
//     if (status) query.status = status;
//     if (memberId) query.member = memberId;
//     if (bookId) query.book = bookId;

//     // Members can only see their own
//     if (req.user.role === 'member') query.member = req.user._id;

//     const total = await Circulation.countDocuments(query);
//     const circulations = await Circulation.find(query)
//       .populate('book', 'title coverImage isbn')
//       .populate('member', 'name email avatar')
//       .populate('issuedBy', 'name')
//       .populate('returnedBy', 'name')
//       .sort('-createdAt')
//       .limit(parseInt(limit))
//       .skip((parseInt(page) - 1) * parseInt(limit));

//     res.json({
//       success: true,
//       circulations,
//       pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
//     });
//   } catch (error) { next(error); }
// };

// // @desc    Get my borrowed books
// // @route   GET /api/circulation/my
// // @access  Member
// const getMyCirculations = async (req, res, next) => {
//   try {
//     const circulations = await Circulation.find({ member: req.user._id })
//       .populate('book', 'title coverImage isbn authors')
//       .sort('-createdAt');
//     res.json({ success: true, circulations });
//   } catch (error) { next(error); }
// };

// module.exports = { issueBook, returnBook, reserveBook, cancelReservation, getCirculations, getMyCirculations };


const Circulation = require('../models/Circulation');
const Book = require('../models/Book');
const User = require('../models/User');
const { SystemSettings, PenaltyRule } = require('../models/index');
const { sendEmail } = require('../utils/email');
const { logActivity } = require('../utils/activityLogger');
const moment = require('moment');


// ✅ ISSUE BOOK (unchanged)
const issueBook = async (req, res, next) => {
  try {
    const { bookId, memberId } = req.body;

    if (!bookId || !memberId) {
      return res.status(400).json({ success: false, message: 'Book & Member required' });
    }

    const settings = await SystemSettings.findOne() || { issueDays: 14 };

    const book = await Book.findById(bookId);
    const member = await User.findById(memberId).populate('membershipPlan');

    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    if (!member.isActive) {
      return res.status(400).json({ success: false, message: 'Member inactive' });
    }

    if (book.availableCopies < 1) {
      return res.status(400).json({ success: false, message: 'No copies available' });
    }

    const limit = member.membershipPlan?.borrowingLimit || 2;
    if (member.booksIssued >= limit) {
      return res.status(400).json({ success: false, message: 'Borrowing limit reached' });
    }

    const existing = await Circulation.findOne({
      book: bookId,
      member: memberId,
      status: 'active',
      type: 'issue',
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Already issued this book' });
    }

    const dueDate = moment().add(settings.issueDays || 14, 'days').toDate();

    const circulation = await Circulation.create({
      book: bookId,
      member: memberId,
      issuedBy: req.user._id,
      type: 'issue',
      status: 'active',
      issueDate: new Date(),
      dueDate,
      bookSnapshot: { title: book.title, isbn: book.isbn },
      memberSnapshot: { name: member.name, email: member.email },
    });

    book.availableCopies -= 1;
    await book.save();

    await User.findByIdAndUpdate(memberId, {
      $inc: { booksIssued: 1 },
    });

    sendEmail({
      to: member.email,
      subject: `Book Issued: ${book.title}`,
      html: `<p>Dear ${member.name},<br/>Book <b>${book.title}</b> issued.<br/>Due: <b>${moment(dueDate).format('MMM DD, YYYY')}</b></p>`,
    }).catch(console.error);

    await logActivity(req.user._id, 'ISSUE_BOOK', `Issued "${book.title}"`, req.ip, 'Circulation');

    res.status(201).json({ success: true, circulation });

  } catch (error) { next(error); }
};


// ✅ RETURN BOOK (unchanged)
const returnBook = async (req, res, next) => {
  try {
    const circulation = await Circulation.findById(req.params.id)
      .populate('book')
      .populate('member');

    if (!circulation) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    if (!['active', 'overdue'].includes(circulation.status)) {
      return res.status(400).json({ success: false, message: 'Not issued' });
    }

    const penaltyRule = await PenaltyRule.findOne() || {
      perDayFine: 1,
      gracePeriodDays: 0,
    };

    const returnDate = new Date();
    let fine = 0;

    if (moment(returnDate).isAfter(circulation.dueDate)) {
      const daysLate = moment(returnDate).diff(moment(circulation.dueDate), 'days');
      const billableDays = Math.max(0, daysLate - (penaltyRule.gracePeriodDays || 0));
      fine = billableDays * (penaltyRule.perDayFine || 1);

      if (penaltyRule.maxFineAmount) {
        fine = Math.min(fine, penaltyRule.maxFineAmount);
      }
    }

    circulation.status = 'returned';
    circulation.returnDate = returnDate;
    circulation.returnedBy = req.user._id;
    circulation.fine = fine;

    await circulation.save();

    circulation.book.availableCopies += 1;
    await circulation.book.save();

    await User.findByIdAndUpdate(circulation.member._id, {
      $inc: {
        booksIssued: -1,
        totalFines: fine > 0 ? fine : 0,
      },
    });

    await logActivity(req.user._id, 'RETURN_BOOK', `Returned "${circulation.book.title}"`, req.ip, 'Circulation');

    res.json({ success: true, circulation, fine });

  } catch (error) { next(error); }
};


// ✅ RESERVE BOOK (unchanged)
const reserveBook = async (req, res, next) => {
  try {
    const { bookId } = req.body;
    const memberId = req.user.role === 'member' ? req.user._id : req.body.memberId;

    const settings = await SystemSettings.findOne() || { reserveDays: 3 };
    const book = await Book.findById(bookId);

    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });

    const alreadyReserved = await Circulation.findOne({
      book: bookId,
      member: memberId,
      status: 'reserved',
    });

    if (alreadyReserved) {
      return res.status(400).json({ success: false, message: 'Already reserved' });
    }

    const reservationExpiry = moment().add(settings.reserveDays || 3, 'days').toDate();

    const circulation = await Circulation.create({
      book: bookId,
      member: memberId,
      type: 'reservation',
      status: 'reserved',
      reservationDate: new Date(),
      reservationExpiry,
      bookSnapshot: { title: book.title, isbn: book.isbn },
    });

    book.reservedCopies = (book.reservedCopies || 0) + 1;
    await book.save();

    await logActivity(memberId, 'RESERVE_BOOK', `Reserved "${book.title}"`, req.ip, 'Circulation');

    res.status(201).json({ success: true, circulation });

  } catch (error) { next(error); }
};


// ✅ CANCEL RESERVATION (unchanged)
const cancelReservation = async (req, res, next) => {
  try {
    const circulation = await Circulation.findById(req.params.id).populate('book');

    if (!circulation) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    if (
      req.user.role === 'member' &&
      circulation.member.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    circulation.status = 'cancelled';
    await circulation.save();

    circulation.book.reservedCopies = Math.max(
      0,
      (circulation.book.reservedCopies || 0) - 1
    );

    await circulation.book.save();

    res.json({ success: true, message: 'Cancelled' });

  } catch (error) { next(error); }
};


// ✅ 🔥 FIXED: GET LIST (IMPORTANT CHANGE)
// const getCirculations = async (req, res, next) => {
//   try {
//     const { type, status, memberId, bookId, page = 1, limit = 20 } = req.query;

//     const query = {};

//     if (type) query.type = type;
//     if (status) query.status = status;
//     if (memberId) query.member = memberId;
//     if (bookId) query.book = bookId;

//     if (req.user.role === 'member') {
//       query.member = req.user._id;
//     }

//     const total = await Circulation.countDocuments(query);

//     const circulations = await Circulation.find(query)
//       .populate('book', 'title isbn')
//       .populate('member', 'name email')
//       .sort('-createdAt')
//       .limit(parseInt(limit))
//       .skip((page - 1) * limit);

//     res.json({
//       success: true,
//       circulations,
//       pagination: {
//         total,
//         page: parseInt(page),
//         pages: Math.ceil(total / limit),
//       },
//     });

//   } catch (error) { next(error); }
// };

const getCirculations = async (req, res, next) => {
  try {
    const { type, status, memberId, bookId, page = 1, limit = 20 } = req.query;

    const query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (memberId) query.member = memberId;
    if (bookId) query.book = bookId;

    if (req.user.role === 'member') {
      query.member = req.user._id;
    }

    const total = await Circulation.countDocuments(query);

    // ✅ 🔥 THIS IS THE IMPORTANT PART
    const circulations = await Circulation.find(query)
      .populate('book', 'title isbn')
      .populate('member', 'name email')
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip((page - 1) * limit);

    res.json({
      success: true,
      circulations,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    next(error);
  }
};


// ✅ 🔥 FIXED: MY BOOKS
const getMyCirculations = async (req, res, next) => {
  try {
    const circulations = await Circulation.find({ member: req.user._id })
      .populate('book', 'title isbn authors')
      .sort('-createdAt');

    res.json({ success: true, circulations });

  } catch (error) { next(error); }
};


module.exports = {
  issueBook,
  returnBook,
  reserveBook,
  cancelReservation,
  getCirculations,
  getMyCirculations,
};