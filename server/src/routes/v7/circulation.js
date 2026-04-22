const express = require('express');
const router = express.Router();
const {
  issueBook, returnBook, reserveBook, cancelReservation,
  getCirculations, getMyCirculations
} = require('../controllers/circulationController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/my', getMyCirculations);
router.get('/', authorize('admin', 'manager'), getCirculations);
router.post('/issue', authorize('admin', 'manager'), issueBook);
router.put('/return/:id', authorize('admin', 'manager'), returnBook);
router.post('/reserve', reserveBook);
router.put('/reserve/:id/cancel', cancelReservation);

module.exports = router;
