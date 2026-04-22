const express = require('express');
const router = express.Router();
const { getUsers, getUser, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', authorize('admin', 'manager'), getUsers);
router.post('/', authorize('admin', 'manager'), createUser);
router.get('/:id', authorize('admin', 'manager'), getUser);
router.put('/:id', authorize('admin', 'manager'), updateUser);
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
