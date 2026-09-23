const multer = require('multer');
const { BadRequestError } = require('../utils/appError');
const config = require('./env');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/heic'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestError(`Unsupported file format '${file.mimetype}'. Allowed formats: JPEG, PNG, WEBP, HEIC.`), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 15
  },
  fileFilter
});

module.exports = upload;
