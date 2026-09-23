const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');

// All admin routes require ADMIN role
router.use(authenticate, authorizeRoles('ADMIN'));

router.get('/analytics', adminController.getAnalytics);
router.get('/moderation', adminController.getModerationQueue);
router.post('/properties/:id/approve', adminController.approveListing);
router.patch('/properties/:id/approve', adminController.approveListing);
router.post('/properties/:id/reject', adminController.rejectListing);
router.patch('/properties/:id/reject', adminController.rejectListing);
router.get('/properties', adminController.getAllProperties);
router.get('/properties/:id', adminController.getPropertyDetails);
router.put('/properties/:id', adminController.updateProperty);
router.delete('/properties/:id', adminController.deleteProperty);
router.patch('/properties/:id/status', adminController.changePropertyStatus);
router.get('/users', adminController.getUsers);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.patch('/users/:id/status', adminController.setUserStatus);
router.get('/agents', adminController.getAgents);
router.patch('/agents/:id/verify', adminController.verifyAgent);
router.get('/reports', adminController.getReports);
router.patch('/reports/:id/status', adminController.updateReport);

module.exports = router;

