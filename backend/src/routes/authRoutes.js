const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const validate = require('../middlewares/validateMiddleware');
const { authenticate } = require('../middlewares/authMiddleware');
const upload = require('../config/multer');
const { registerSchema, loginSchema, updateProfileSchema } = require('../validators/authValidators');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Limit each IP to 20 auth requests per 15 minutes
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
    }
  }
});

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/google', authController.googleAuth);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, upload.single('avatar'), validate(updateProfileSchema), authController.updateMe);

module.exports = router;
