const express = require('express');
const router = express.Router();
const dealController = require('../controllers/dealController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');

// All deal routes require authentication
router.use(authenticate);

// Customer endpoints
router.post('/', authorizeRoles('CUSTOMER', 'AGENT', 'ADMIN'), dealController.createDeal);
router.get('/my-deals', authorizeRoles('CUSTOMER', 'AGENT', 'ADMIN'), dealController.getCustomerDeals);

// Agent endpoints
router.get('/agent-deals', authorizeRoles('AGENT', 'ADMIN'), dealController.getAgentDeals);

// Shared endpoints
router.get('/:id', dealController.getDealById);
router.patch('/:id/status', dealController.updateDealStatus);

module.exports = router;
