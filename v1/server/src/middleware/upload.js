const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'uploads/misc';
    if (file.fieldname === 'cover') folder = 'uploads/covers';
    else if (file.fieldname === 'ebook') folder = 'uploads/books';
    else if (file.fieldname === 'logo') folder = 'uploads/settings';
    else if (file.fieldname === 'avatar') folder = 'uploads/avatars';
    else if (file.fieldname === 'excel') folder = 'uploads/imports';

    ensureDir(folder);
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const imageTypes = /jpeg|jpg|png|webp|gif/;
  const ebookTypes = /pdf|epub/;
  const excelTypes = /xlsx|xls|csv/;

  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');

  if (file.fieldname === 'cover' || file.fieldname === 'logo' || file.fieldname === 'avatar') {
    if (imageTypes.test(ext)) return cb(null, true);
    return cb(new Error('Only image files are allowed'), false);
  }
  if (file.fieldname === 'ebook') {
    if (ebookTypes.test(ext)) return cb(null, true);
    return cb(new Error('Only PDF or EPUB files are allowed'), false);
  }
  if (file.fieldname === 'excel') {
    if (excelTypes.test(ext)) return cb(null, true);
    return cb(new Error('Only Excel/CSV files are allowed'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 },
});

module.exports = upload;
