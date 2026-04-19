/**
 * storage.js
 * Wraps AWS S3 (or any S3-compatible store like MinIO / GCS interop).
 * Set USE_LOCAL=true in .env to fall back to local disk (development).
 *
 * Required .env keys:
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION,
 *   AWS_BUCKET_NAME, SIGNED_URL_EXPIRES_SECONDS (default 300)
 */

const path  = require('path');
const fs    = require('fs');

// Lazy-load AWS SDK so the app starts without crashing when creds are absent
let s3Client = null;
const getS3 = () => {
  if (s3Client) return s3Client;
  // eslint-disable-next-line global-require
  const { S3Client } = require('@aws-sdk/client-s3');
  s3Client = new S3Client({
    region:      process.env.AWS_REGION      || 'us-east-1',
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  return s3Client;
};

const BUCKET  = process.env.AWS_BUCKET_NAME || 'lms-books';
const EXPIRES = parseInt(process.env.SIGNED_URL_EXPIRES_SECONDS || '300', 10);
const USE_LOCAL = process.env.USE_LOCAL_STORAGE === 'true';

// ─── Upload ────────────────────────────────────────────────────────────────────
/**
 * Upload a file buffer to S3.
 * @param {Buffer} buffer
 * @param {string} key        – S3 object key, e.g. "ebooks/uuid.pdf"
 * @param {string} mimeType
 * @returns {Promise<string>} – the S3 key (store this in DB)
 */
const uploadToS3 = async (buffer, key, mimeType) => {
  if (USE_LOCAL) {
    // Development: write to ./uploads/s3-sim/<key>
    const dest = path.join(__dirname, '../../uploads/s3-sim', key);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buffer);
    return key;
  }

  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  await getS3().send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: mimeType,
    // Server-side encryption
    ServerSideEncryption: 'AES256',
  }));
  return key;
};

// ─── Signed URL ───────────────────────────────────────────────────────────────
/**
 * Generate a pre-signed GET URL that expires after EXPIRES seconds.
 * @param {string} key  – S3 object key stored in DB
 * @returns {Promise<string>} – short-lived URL
 */
const getSignedUrl = async (key) => {
  if (USE_LOCAL) {
    // In local mode return a static path (no expiry)
    return `/uploads/s3-sim/${key}`;
  }

  const { GetObjectCommand } = require('@aws-sdk/client-s3');
  const { getSignedUrl: awsGetSignedUrl } = require('@aws-sdk/s3-request-presigner');

  return awsGetSignedUrl(
    getS3(),
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: EXPIRES },
  );
};

// ─── Delete ───────────────────────────────────────────────────────────────────
const deleteFromS3 = async (key) => {
  if (USE_LOCAL) {
    const dest = path.join(__dirname, '../../uploads/s3-sim', key);
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    return;
  }
  const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
  await getS3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
};

// ─── Watermark (PDF) ──────────────────────────────────────────────────────────
/**
 * Add a text watermark to every page of a PDF.
 * Uses pdf-lib (install: npm i pdf-lib).
 * Falls back gracefully if pdf-lib is not installed.
 *
 * @param {Buffer} pdfBuffer
 * @param {string} text       – e.g. user email
 * @returns {Promise<Buffer>} – watermarked PDF buffer
 */
const watermarkPdf = async (pdfBuffer, text) => {
  try {
    // eslint-disable-next-line global-require
    const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const font   = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const pages  = pdfDoc.getPages();

    for (const page of pages) {
      const { width, height } = page.getSize();
      // Diagonal watermark
      page.drawText(text, {
        x:        width  / 2 - 120,
        y:        height / 2,
        size:     14,
        font,
        color:    rgb(0.75, 0.75, 0.75),
        opacity:  0.35,
        rotate:   { type: 'degrees', angle: -45 },
      });
      // Footer line
      page.drawText(`Licensed to: ${text}`, {
        x:    20,
        y:    14,
        size: 8,
        font,
        color: rgb(0.6, 0.6, 0.6),
        opacity: 0.6,
      });
    }
    return Buffer.from(await pdfDoc.save());
  } catch (err) {
    // pdf-lib not installed or failed — return original
    console.warn('Watermark skipped:', err.message);
    return pdfBuffer;
  }
};



// ─── Get raw buffer from S3 (used for watermarking) ───────────────────────────
const getObjectBuffer = async (key) => {
  if (USE_LOCAL) {
    const dest = path.join(__dirname, '../../uploads/s3-sim', key);
    return fs.readFileSync(dest);
  }
  const { GetObjectCommand } = require('@aws-sdk/client-s3');
  const resp = await getS3().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks = [];
  for await (const chunk of resp.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
};

// Re-export everything including the new function
module.exports = { uploadToS3, getSignedUrl, deleteFromS3, watermarkPdf, getObjectBuffer };
