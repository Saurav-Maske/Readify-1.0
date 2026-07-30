const multer = require('multer');

// Profile pictures are stored as bytes in the users table (profile_picture_data
// / profile_picture_mime), not on local disk - Render's disk is ephemeral, so
// anything written to /uploads at runtime gets wiped on redeploy/restart.
// multer.memoryStorage() just gives us req.file.buffer + req.file.mimetype;
// profileController writes those straight to Postgres.
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, WEBP, or GIF images are allowed'));
  }
  cb(null, true);
}

const uploadProfilePicture = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = uploadProfilePicture;