const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

const UPLOADS_DIR = path.resolve(__dirname, '../../public/uploads/properties');

// Ensure directory exists
async function ensureUploadDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

async function processAndSaveImage(fileBuffer, originalName) {
  await ensureUploadDir();

  const fileId = crypto.randomUUID();
  const standardFileName = `${fileId}.webp`;
  const thumbFileName = `${fileId}_thumb.webp`;

  const standardFilePath = path.join(UPLOADS_DIR, standardFileName);
  const thumbFilePath = path.join(UPLOADS_DIR, thumbFileName);

  // 1. Process Standard (High-Def)
  await sharp(fileBuffer)
    .rotate() // auto-orient by EXIF
    .resize(1600, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(standardFilePath);

  // 2. Process Thumbnail
  await sharp(fileBuffer)
    .rotate()
    .resize(480, 360, { fit: 'cover' })
    .webp({ quality: 78 })
    .toFile(thumbFilePath);

  return {
    fileKey: fileId,
    url: `/uploads/properties/${standardFileName}`,
    thumbnailUrl: `/uploads/properties/${thumbFileName}`,
    originalName
  };
}

async function deleteImageFiles(fileKey) {
  try {
    const standardFilePath = path.join(UPLOADS_DIR, `${fileKey}.webp`);
    const thumbFilePath = path.join(UPLOADS_DIR, `${fileKey}_thumb.webp`);

    await fs.unlink(standardFilePath).catch(() => {});
    await fs.unlink(thumbFilePath).catch(() => {});
  } catch (err) {
    console.error('Error removing image files:', err);
  }
}

module.exports = {
  processAndSaveImage,
  deleteImageFiles
};
