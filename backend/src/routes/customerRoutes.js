const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// Public customer directory
router.get('/', customerController.getCustomers);

module.exports = router;
