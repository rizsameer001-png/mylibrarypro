const express = require('express');
const router  = express.Router({ mergeParams: true }); // needs :bookId from parent
const { getGallery, addImages, reorderImages, deleteImage, setPrimary } = require('../controllers/galleryController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/',                protect, getGallery);
router.post('/',               protect, authorize('admin', 'manager'), upload.array('images', 10), addImages);
router.put('/reorder',         protect, authorize('admin', 'manager'), reorderImages);
router.delete('/:imageId',     protect, authorize('admin', 'manager'), deleteImage);
router.put('/:imageId/primary',protect, authorize('admin', 'manager'), setPrimary);

module.exports = router;
