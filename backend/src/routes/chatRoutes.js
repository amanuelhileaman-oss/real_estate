const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middlewares/authMiddleware');

// All chat routes require authentication
router.use(authenticate);

router.get('/conversations', chatController.getConversations);
router.post('/conversations', chatController.startConversation);
router.get('/conversations/:id/messages', chatController.getMessages);
router.post('/conversations/:id/messages', chatController.sendMessage);
router.get('/unread-count', chatController.getUnreadCount);
router.get('/contacts', chatController.getContacts);

module.exports = router;
