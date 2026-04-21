const express = require('express');
const router  = express.Router({ mergeParams: true });
const {
  getGallery, addImageUrl, reorderImages, deleteImage, setPrimary,
} = require('../controllers/galleryController');
const { protect, authorize } = require('../middleware/auth');

router.get('/',                  protect, getGallery);
router.post('/add-url',          protect, authorize('admin', 'manager'), addImageUrl);
router.put('/reorder',           protect, authorize('admin', 'manager'), reorderImages);
router.delete('/:imageId',       protect, authorize('admin', 'manager'), deleteImage);
router.put('/:imageId/primary',  protect, authorize('admin', 'manager'), setPrimary);

module.exports = router;
