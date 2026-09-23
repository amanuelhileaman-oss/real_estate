const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const propertyRoutes = require('./propertyRoutes');
const favoriteRoutes = require('./favoriteRoutes');
const inquiryRoutes = require('./inquiryRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const agentRoutes = require('./agentRoutes');
const adminRoutes = require('./adminRoutes');
const reportRoutes = require('./reportRoutes');
const notificationRoutes = require('./notificationRoutes');
const chatRoutes = require('./chatRoutes');
const dealRoutes = require('./dealRoutes');

router.use('/auth', authRoutes);
router.use('/properties', propertyRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/inquiries', inquiryRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/agents', agentRoutes);
router.use('/admin', adminRoutes);
router.use('/reports', reportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/chat', chatRoutes);
router.use('/deals', dealRoutes);

module.exports = router;
