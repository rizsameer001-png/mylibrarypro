const mongoose = require('mongoose');

const circulationSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  returnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  type: {
    type: String,
    enum: ['issue', 'reservation'],
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'returned', 'overdue', 'reserved', 'cancelled', 'expired'],
    default: 'active',
  },

  issueDate: { type: Date },
  dueDate: { type: Date },
  returnDate: { type: Date },

  reservationDate: { type: Date },
  reservationExpiry: { type: Date },

  fine: { type: Number, default: 0 },
  finePaid: { type: Boolean, default: false },
  finePaidDate: { type: Date },

  notes: { type: String },
}, { timestamps: true });

circulationSchema.index({ member: 1, status: 1 });
circulationSchema.index({ book: 1, status: 1 });

module.exports = mongoose.model('Circulation', circulationSchema);
