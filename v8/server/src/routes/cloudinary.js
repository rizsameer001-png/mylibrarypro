/**
 * Cloudinary signed upload route
 * Client requests a signature → uploads directly to Cloudinary → sends URL back to our API
 * This means NO files are written to Render's ephemeral disk.
 */
const express   = require('express');
const router    = express.Router();
const crypto    = require('crypto');
const { protect } = require('../middleware/auth');

// GET /api/cloudinary/sign?folder=lms/covers&resource_type=image
router.get('/sign', protect, (req, res) => {
  try {
    const { folder = 'lms/covers', resource_type = 'image' } = req.query;

    const timestamp  = Math.round(Date.now() / 1000);
    const apiSecret  = process.env.CLOUDINARY_API_SECRET;
    const apiKey     = process.env.CLOUDINARY_API_KEY;
    const cloudName  = process.env.CLOUDINARY_CLOUD_NAME;

    if (!apiSecret || !apiKey || !cloudName) {
      return res.status(500).json({ success: false, message: 'Cloudinary not configured on server' });
    }

    // Parameters that must be signed (alphabetical order)
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature    = crypto
      .createHash('sha256')
      .update(paramsToSign + apiSecret)
      .digest('hex');

    res.json({
      success:       true,
      signature,
      timestamp,
      apiKey,
      cloudName,
      folder,
      resourceType:  resource_type,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/cloudinary/config  — returns public config for the upload widget
router.get('/config', (req, res) => {
  res.json({
    success:   true,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
  });
});

module.exports = router;
