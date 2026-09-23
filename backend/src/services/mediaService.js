const sharp = require('sharp');
const cloudinary = require('cloudinary').v2;
const config = require('../config/env');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET
});

function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

async function processAndSaveImage(fileBuffer, originalName, folder = 'properties') {
  // 1. Process Standard (High-Def)
  const processedBuffer = await sharp(fileBuffer)
    .rotate() // auto-orient by EXIF
    .resize(1600, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  // 2. Upload to Cloudinary
  const result = await uploadToCloudinary(processedBuffer, `realestate/${folder}`);

  // Cloudinary allows generating thumbnails dynamically via URL parameters
  const thumbnailUrl = result.secure_url.replace('/upload/', '/upload/c_fill,h_360,w_480/q_78/');

  return {
    fileKey: result.public_id, 
    url: result.secure_url,
    thumbnailUrl: thumbnailUrl,
    originalName
  };
}

async function deleteImageFiles(fileKey, folder = 'properties') {
  try {
    if (fileKey) {
      await cloudinary.uploader.destroy(fileKey);
    }
  } catch (err) {
    console.error('Error removing image from Cloudinary:', err);
  }
}

module.exports = {
  processAndSaveImage,
  deleteImageFiles
};
