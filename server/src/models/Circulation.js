// const mongoose = require('mongoose');

// const circulationSchema = new mongoose.Schema({
//   book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
//   member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//   returnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

//   type: {
//     type: String,
//     enum: ['issue', 'reservation'],
//     required: true,
//   },
//   status: {
//     type: String,
//     enum: ['active', 'returned', 'overdue', 'reserved', 'cancelled', 'expired'],
//     default: 'active',
//   },

//   issueDate: { type: Date },
//   dueDate: { type: Date },
//   returnDate: { type: Date },

//   reservationDate: { type: Date },
//   reservationExpiry: { type: Date },

//   fine: { type: Number, default: 0 },
//   finePaid: { type: Boolean, default: false },
//   finePaidDate: { type: Date },

//   notes: { type: String },
// }, { timestamps: true });

// circulationSchema.index({ member: 1, status: 1 });
// circulationSchema.index({ book: 1, status: 1 });

// module.exports = mongoose.model('Circulation', circulationSchema);

const mongoose = require('mongoose');

const circulationSchema = new mongoose.Schema({
  // 🔗 References
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
  },

  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  returnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // 📦 Type of transaction
  type: {
    type: String,
    enum: ['issue', 'reservation'],
    required: true,
  },

  // 📊 Status
  status: {
    type: String,
    enum: ['active', 'returned', 'overdue', 'reserved', 'cancelled', 'expired'],
    default: 'active',
  },

  // 📅 Issue lifecycle
  issueDate: Date,
  dueDate: Date,
  returnDate: Date,

  // 📅 Reservation lifecycle
  reservationDate: Date,
  reservationExpiry: Date,

  // 💰 Fine tracking
  fine: {
    type: Number,
    default: 0,
    min: 0,
  },

  finePaid: {
    type: Boolean,
    default: false,
  },

  finePaidDate: Date,

  // 📝 Notes (admin remarks)
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
  },

  // ⚡ Snapshot (for fast UI + historical accuracy)
  bookSnapshot: {
    title: String,
    isbn: String,
  },

  memberSnapshot: {
    name: String,
    email: String,
  },

}, {
  timestamps: true,
});


// ⚡ Indexes for performance
circulationSchema.index({ member: 1, status: 1 });
circulationSchema.index({ book: 1, status: 1 });
circulationSchema.index({ dueDate: 1 }); // useful for overdue checks


// 🔒 Prevent duplicate active issue for same book + member
circulationSchema.index(
  { book: 1, member: 1, status: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: 'active',
      type: 'issue',
    },
  }
);


// 🎯 Virtual: isOverdue
circulationSchema.virtual('isOverdue').get(function () {
  return this.status === 'active' && this.dueDate && new Date() > this.dueDate;
});


// 🎯 Auto-update overdue status before save
circulationSchema.pre('save', function (next) {
  if (this.status === 'active' && this.dueDate && new Date() > this.dueDate) {
    this.status = 'overdue';
  }
  next();
});


module.exports = mongoose.model('Circulation', circulationSchema);