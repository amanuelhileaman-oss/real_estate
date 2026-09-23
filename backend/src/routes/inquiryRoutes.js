const express = require('express');
const router = express.Router();
const inquiryController = require('../controllers/inquiryController');
const validate = require('../middlewares/validateMiddleware');
const { authenticate, optionalAuthenticate } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');
const { createInquirySchema, updateInquiryStatusSchema } = require('../validators/inquiryValidators');

// Public or logged-in users can send inquiries
router.post('/', optionalAuthenticate, validate(createInquirySchema), inquiryController.createInquiry);

// Customer inquiries
router.get('/my', authenticate, authorizeRoles('CUSTOMER', 'ADMIN'), inquiryController.getMyInquiries);

// Agent inquiry management
router.get('/agent', authenticate, authorizeRoles('AGENT', 'ADMIN'), inquiryController.getAgentInquiries);
router.patch('/:id/status', authenticate, authorizeRoles('AGENT', 'ADMIN'), validate(updateInquiryStatusSchema), inquiryController.updateInquiryStatus);

module.exports = router;

