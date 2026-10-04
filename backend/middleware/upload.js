const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}`;
    cb(null, `${base}${ext}`);
  },
});

const maxBytes = Number(process.env.MAX_VIDEO_MB || 100) * 1024 * 1024;

const mediaUpload = multer({
  storage,
  limits: { fileSize: maxBytes },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'video' && !file.mimetype.startsWith('video/')) return cb(new Error('Please upload a video file.'));
    if (file.fieldname === 'thumbnail' && !file.mimetype.startsWith('image/')) return cb(new Error('Thumbnail must be an image.'));
    cb(null, true);
  },
});

module.exports = { mediaUpload, uploadDir };
