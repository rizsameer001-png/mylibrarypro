/**
 * upload.js  —  Multer middleware
 * Handles all file uploads with per-field routing and type validation.
 * Files are stored in temp disk locations; controllers upload to Cloudinary
 * then delete the temp file.
 */
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };

// Temp upload directory (always use /tmp-style path before Cloudinary)
const TEMP_DIR = 'uploads/tmp';
ensureDir(TEMP_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = TEMP_DIR;
    // Keep distinct sub-folders for legacy local mode
    const map = {
      cover:   'uploads/covers',
      ebook:   'uploads/books',
      logo:    'uploads/settings',
      avatar:  'uploads/avatars',
      excel:   'uploads/imports',
      images:  'uploads/gallery',   // gallery multi-upload
    };
    if (map[file.fieldname]) folder = map[file.fieldname];
    ensureDir(folder);
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uid = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uid}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');

  const IMAGE_TYPES  = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
  const EBOOK_TYPES  = ['pdf', 'epub', 'mobi'];
  const EXCEL_TYPES  = ['xlsx', 'xls', 'csv'];

  if (['cover', 'logo', 'avatar', 'images'].includes(file.fieldname)) {
    if (IMAGE_TYPES.includes(ext)) return cb(null, true);
    return cb(new Error(`Only image files allowed for ${file.fieldname}`), false);
  }
  if (file.fieldname === 'ebook') {
    if ([...IMAGE_TYPES, ...EBOOK_TYPES].includes(ext)) return cb(null, true);
    return cb(new Error('Only PDF, EPUB, MOBI or image files allowed for ebook'), false);
  }
  if (file.fieldname === 'excel') {
    if (EXCEL_TYPES.includes(ext)) return cb(null, true);
    return cb(new Error('Only Excel/CSV files allowed'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '100000000') }, // 100 MB default
});

module.exports = upload;
