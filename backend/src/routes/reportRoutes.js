const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { optionalAuthenticate } = require('../middlewares/authMiddleware');

router.post('/', optionalAuthenticate, reportController.createReport);

module.exports = router;
