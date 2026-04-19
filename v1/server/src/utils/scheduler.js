const cron = require('node-cron');
const moment = require('moment');
const Circulation = require('../models/Circulation');
const Book = require('../models/Book');
const User = require('../models/User');
const { PenaltyRule } = require('../models/index');
const { sendEmail } = require('./email');

const scheduleJobs = () => {
  // Run every day at midnight - mark overdue books and calculate fines
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ Running daily overdue check...');
    try {
      const penaltyRule = await PenaltyRule.findOne() || { perDayFine: 1, gracePeriodDays: 0, maxFineAmount: 100 };

      const overdues = await Circulation.find({
        type: 'issue',
        status: 'active',
        dueDate: { $lt: new Date() },
      }).populate('book', 'title').populate('member', 'name email');

      for (const circ of overdues) {
        const daysLate = moment().diff(moment(circ.dueDate), 'days');
        const billable = Math.max(0, daysLate - (penaltyRule.gracePeriodDays || 0));
        const fine = Math.min(billable * penaltyRule.perDayFine, penaltyRule.maxFineAmount || Infinity);

        circ.status = 'overdue';
        circ.fine = fine;
        await circ.save();

        // Send overdue email
        if (circ.member?.email) {
          sendEmail({
            to: circ.member.email,
            subject: `Overdue Book: ${circ.book?.title}`,
            html: `<p>Dear ${circ.member.name}, the book <b>${circ.book?.title}</b> was due on ${moment(circ.dueDate).format('MMM DD, YYYY')}. Current fine: <b>$${fine.toFixed(2)}</b>. Please return it immediately.</p>`,
          }).catch(console.error);
        }
      }
      console.log(`✅ Marked ${overdues.length} books as overdue`);
    } catch (err) {
      console.error('Overdue job error:', err.message);
    }
  });

  // Run every hour - expire reservations
  cron.schedule('0 * * * *', async () => {
    try {
      const expired = await Circulation.find({
        type: 'reservation',
        status: 'reserved',
        reservationExpiry: { $lt: new Date() },
      }).populate('book');

      for (const circ of expired) {
        circ.status = 'expired';
        await circ.save();

        if (circ.book) {
          circ.book.reservedCopies = Math.max(0, circ.book.reservedCopies - 1);
          await circ.book.save();
        }
      }
      if (expired.length > 0) console.log(`✅ Expired ${expired.length} reservations`);
    } catch (err) {
      console.error('Reservation expiry job error:', err.message);
    }
  });

  // Run every day at 9am - send due-soon reminders (2 days before due)
  cron.schedule('0 9 * * *', async () => {
    try {
      const soon = moment().add(2, 'days').toDate();
      const dueSoon = await Circulation.find({
        type: 'issue',
        status: 'active',
        dueDate: { $gte: new Date(), $lte: soon },
      }).populate('book', 'title').populate('member', 'name email');

      for (const circ of dueSoon) {
        if (circ.member?.email) {
          sendEmail({
            to: circ.member.email,
            subject: `Reminder: Book Due Soon - ${circ.book?.title}`,
            html: `<p>Dear ${circ.member.name}, <b>${circ.book?.title}</b> is due on <b>${moment(circ.dueDate).format('MMM DD, YYYY')}</b>. Please return it on time to avoid fines.</p>`,
          }).catch(console.error);
        }
      }
      if (dueSoon.length > 0) console.log(`📧 Sent ${dueSoon.length} due-soon reminders`);
    } catch (err) {
      console.error('Reminder job error:', err.message);
    }
  });

  console.log('⏰ Scheduled jobs initialized');
};

module.exports = { scheduleJobs };
