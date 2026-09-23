const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://amanuel@localhost:5433/realestate',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_key_development_only',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key_development_only',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173'],
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'public/uploads',
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@apexrealty.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'AdminSecure2026!',
  ADMIN_FIRST_NAME: process.env.ADMIN_FIRST_NAME || 'Platform',
  ADMIN_LAST_NAME: process.env.ADMIN_LAST_NAME || 'Admin',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || ''
};

