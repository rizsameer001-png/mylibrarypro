/**
 * cloudinary.js
 * Wraps Cloudinary SDK for all file uploads:
 *  - Book cover images  (image resource type)
 *  - Digital files: PDF, EPUB, MOBI  (raw resource type)
 *
 * Required .env keys:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *   CLOUDINARY_SIGNED_URL_EXPIRES  (seconds, default 300)
 *
 * Set USE_LOCAL_STORAGE=true to skip Cloudinary and use local disk (dev/testing).
 */

const path = require('path');
const fs   = require('fs');

const USE_LOCAL = process.env.USE_LOCAL_STORAGE === 'true';
const EXPIRES   = parseInt(process.env.CLOUDINARY_SIGNED_URL_EXPIRES || '300', 10);
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// Lazy-init Cloudinary so the server starts without crashing when keys are absent
let _cloudinary = null;
const cld = () => {
  if (_cloudinary) return _cloudinary;
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure:     true,
  });
  _cloudinary = cloudinary;
  return cloudinary;
};

// ── helpers ────────────────────────────────────────────────────────────────────
const LOCAL_BASE = path.join(__dirname, '../../uploads/cloudinary-sim');
const ensureDir  = (d) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); };

// Derive resource_type from file extension
const resourceType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  if (['.pdf', '.epub', '.mobi'].includes(ext)) return 'raw';
  return 'image';
};

// ── uploadToCloudinary ─────────────────────────────────────────────────────────
/**
 * Upload a file (by disk path) to Cloudinary.
 * Returns { publicId, secureUrl, resourceType, bytes, format }
 */
const uploadToCloudinary = async (filePath, options = {}) => {
  const filename = path.basename(filePath);
  const rType    = options.resourceType || resourceType(filename);

  // if (USE_LOCAL) {
  //   // Dev fallback: copy file into a local sim folder and return a fake record
  //   const folder = options.folder || 'misc';
  //   const dest   = path.join(LOCAL_BASE, folder, filename);
  //   ensureDir(path.dirname(dest));
  //   fs.copyFileSync(filePath, dest);
  //   // const publicId = `${folder}/${path.basename(filename, path.extname(filename))}`;
  //   const publicId = `${folder}/${filename}`; // keep extension
  //   return {
  //     publicId,
  //     // secureUrl:    `/uploads/cloudinary-sim/${folder}/${filename}`,
  //     //secureUrl: `uploads/cloudinary-sim/${folder}/${filename}`,
  //     secureUrl: `${BASE_URL}/uploads/cloudinary-sim/${folder}/${filename}`,
  //     resourceType: rType,
  //     bytes:        fs.statSync(filePath).size,
  //     format:       path.extname(filename).replace('.', ''),
  //   };
  // }

  if (USE_LOCAL) {
  const folder = options.folder || 'misc';
  const dest   = path.join(LOCAL_BASE, folder, filename);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(filePath, dest);

  const publicId = `${folder}/${filename}`;

  return {
    publicId,
    secureUrl: `${BASE_URL}/uploads/cloudinary-sim/${folder}/${filename}`,
    resourceType: rType,
    bytes: fs.statSync(filePath).size,
    format: path.extname(filename).replace('.', ''),
  };
}

  const result = await cld().uploader.upload(filePath, {
    resource_type:  rType,
    folder:         options.folder || 'lms',
    public_id:      options.publicId,
    overwrite:      true,
    // For raw files Cloudinary streams them without transformation
    ...(rType === 'raw' ? {} : {
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    }),
  });

  return {
    publicId:     result.public_id,
    secureUrl:    result.secure_url,
    resourceType: result.resource_type,
    bytes:        result.bytes,
    format:       result.format,
  };
};

// ── getSignedUrl ───────────────────────────────────────────────────────────────
/**
 * Generate a signed, time-limited delivery URL for a Cloudinary asset.
 * For 'raw' resources this is required to prevent direct public access.
 */
const getCloudinarySignedUrl = (publicId, rType = 'raw') => {
  if (USE_LOCAL) {
    // In local mode just return the static path (no expiry)
    return `/uploads/cloudinary-sim/${publicId}`;
  }

  const timestamp = Math.floor(Date.now() / 1000) + EXPIRES;

  return cld().utils.private_download_url(publicId, '', {
    resource_type: rType,
    expires_at:    timestamp,
    attachment:    false,   // inline display (reader); set true to force download
  });
};

/**
 * Generate a signed URL specifically for download (attachment=true).
 */
const getCloudinaryDownloadUrl = (publicId, rType = 'raw') => {
  if (USE_LOCAL) return `/uploads/cloudinary-sim/${publicId}`;

  const timestamp = Math.floor(Date.now() / 1000) + EXPIRES;
  return cld().utils.private_download_url(publicId, '', {
    resource_type: rType,
    expires_at:    timestamp,
    attachment:    true,
  });
};

// ── deleteFromCloudinary ───────────────────────────────────────────────────────
const deleteFromCloudinary = async (publicId, rType = 'image') => {
  if (USE_LOCAL) {
    // const p = path.join(LOCAL_BASE, `${publicId}`);
    const p = path.join(LOCAL_BASE, `${publicId}${rType === 'image' ? '' : ''}`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return;
  }
  await cld().uploader.destroy(publicId, { resource_type: rType });
};

// ── getBuffer (for watermarking pipeline) ─────────────────────────────────────
const getCloudinaryBuffer = async (publicId, rType = 'raw') => {
  if (USE_LOCAL) {
    return fs.readFileSync(path.join(LOCAL_BASE, `${publicId}`));
  }
  // Download via signed URL
  const url = getCloudinarySignedUrl(publicId, rType);
  const axios = require('axios');
  const resp  = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(resp.data);
};

module.exports = {
  uploadToCloudinary,
  getCloudinarySignedUrl,
  getCloudinaryDownloadUrl,
  deleteFromCloudinary,
  getCloudinaryBuffer,
  resourceType,
};
