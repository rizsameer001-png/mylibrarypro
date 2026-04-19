const express = require('express');
const router = express.Router();
const { getCirculationReport, getOverdueReport } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin', 'manager'));
router.get('/circulation', getCirculationReport);
router.get('/overdue', getOverdueReport);

module.exports = router;
