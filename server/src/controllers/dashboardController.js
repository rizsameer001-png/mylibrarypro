const Book = require('../models/Book');
const User = require('../models/User');
const Circulation = require('../models/Circulation');
const { ActivityLog } = require('../models/index');
const moment = require('moment');
const XLSX = require('xlsx');

// @desc    Get dashboard stats
// @route   GET /api/dashboard
// @access  Admin/Manager
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalBooks,
      totalMembers,
      activeIssues,
      overdueBooks,
      totalReservations,
      recentActivity,
    ] = await Promise.all([
      Book.countDocuments({ status: 'active' }),
      User.countDocuments({ role: 'member', isActive: true }),
      Circulation.countDocuments({ type: 'issue', status: 'active' }),
      Circulation.countDocuments({ status: 'overdue' }),
      Circulation.countDocuments({ type: 'reservation', status: 'reserved' }),
      ActivityLog.find().populate('user', 'name').sort('-createdAt').limit(10),
    ]);

    // Books issued per month (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const start = moment().subtract(i, 'months').startOf('month').toDate();
      const end = moment().subtract(i, 'months').endOf('month').toDate();
      const issued = await Circulation.countDocuments({ type: 'issue', issueDate: { $gte: start, $lte: end } });
      const returned = await Circulation.countDocuments({ status: 'returned', returnDate: { $gte: start, $lte: end } });
      monthlyData.push({
        month: moment().subtract(i, 'months').format('MMM YYYY'),
        issued,
        returned,
      });
    }

    res.json({
      success: true,
      stats: { totalBooks, totalMembers, activeIssues, overdueBooks, totalReservations },
      monthlyData,
      recentActivity,
    });
  } catch (error) { next(error); }
};

// @desc    Get circulation report
// @route   GET /api/reports/circulation
// @access  Admin/Manager
const getCirculationReport = async (req, res, next) => {
  try {
    const { from, to, type, status, export: doExport } = req.query;
    const query = {};
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }
    if (type) query.type = type;
    if (status) query.status = status;

    const circulations = await Circulation.find(query)
      .populate('book', 'title isbn')
      .populate('member', 'name email')
      .sort('-createdAt');

    if (doExport === 'true') {
      const data = circulations.map(c => ({
        'Book Title': c.book?.title,
        'ISBN': c.book?.isbn,
        'Member': c.member?.name,
        'Member Email': c.member?.email,
        'Type': c.type,
        'Status': c.status,
        'Issue Date': c.issueDate ? moment(c.issueDate).format('DD/MM/YYYY') : '',
        'Due Date': c.dueDate ? moment(c.dueDate).format('DD/MM/YYYY') : '',
        'Return Date': c.returnDate ? moment(c.returnDate).format('DD/MM/YYYY') : '',
        'Fine': c.fine || 0,
        'Fine Paid': c.finePaid ? 'Yes' : 'No',
      }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), 'Circulation');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', 'attachment; filename=circulation-report.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buffer);
    }

    res.json({ success: true, circulations, total: circulations.length });
  } catch (error) { next(error); }
};

// @desc    Get overdue report
// @route   GET /api/reports/overdue
// @access  Admin/Manager
const getOverdueReport = async (req, res, next) => {
  try {
    const overdues = await Circulation.find({
      type: 'issue',
      status: { $in: ['active', 'overdue'] },
      dueDate: { $lt: new Date() },
    })
      .populate('book', 'title isbn coverImage')
      .populate('member', 'name email phone')
      .sort('dueDate');

    res.json({ success: true, overdues, total: overdues.length });
  } catch (error) { next(error); }
};

module.exports = { getDashboardStats, getCirculationReport, getOverdueReport };
