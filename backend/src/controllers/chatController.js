const chatRepository = require('../repositories/chatRepository');
const userRepository = require('../repositories/userRepository');
const notificationRepository = require('../repositories/notificationRepository');
const { successResponse } = require('../utils/apiResponse');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/appError');

async function getConversations(req, res, next) {
  try {
    const conversations = await chatRepository.getUserConversations(req.user.id);
    return successResponse(res, conversations, 'Conversations retrieved');
  } catch (err) {
    next(err);
  }
}

async function startConversation(req, res, next) {
  try {
    let { recipientId, propertyId, title, initialMessage } = req.body;

    // If no recipient specified but role is SUPPORT, find first active admin
    if (!recipientId && req.body.type === 'SUPPORT') {
      const adminRes = await userRepository.findByEmail('admin@apexrealty.com');
      if (adminRes) {
        recipientId = adminRes.id;
      }
    }

    if (!recipientId) {
      throw new BadRequestError('Recipient ID is required to initiate a conversation.');
    }

    if (recipientId === req.user.id) {
      throw new BadRequestError('You cannot start a conversation with yourself.');
    }

    const conversation = await chatRepository.findOrCreateConversation({
      userId: req.user.id,
      recipientId,
      propertyId: propertyId || null,
      title: title || null
    });

    // If initialMessage was sent alongside conversation start
    if (initialMessage && initialMessage.trim()) {
      await chatRepository.createMessage({
        conversationId: conversation.id,
        senderId: req.user.id,
        message: initialMessage.trim()
      });

      // Send in-app notification to recipient
      await notificationRepository.createNotification({
        userId: recipientId,
        type: 'NEW_CHAT_MESSAGE',
        title: `New Message from ${req.user.first_name} ${req.user.last_name}`,
        message: initialMessage.slice(0, 80),
        linkUrl: `/portal/chat?conversationId=${conversation.id}`,
        metadata: { conversationId: conversation.id, senderId: req.user.id }
      });
    }

    return successResponse(res, conversation, 'Conversation ready', 201);
  } catch (err) {
    next(err);
  }
}

async function getMessages(req, res, next) {
  try {
    const messages = await chatRepository.getConversationMessages(req.params.id, req.user.id);
    if (!messages) {
      throw new ForbiddenError('You are not authorized to view this conversation.');
    }
    return successResponse(res, messages, 'Messages retrieved');
  } catch (err) {
    next(err);
  }
}

async function sendMessage(req, res, next) {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      throw new BadRequestError('Message cannot be empty.');
    }

    const newMsg = await chatRepository.createMessage({
      conversationId: req.params.id,
      senderId: req.user.id,
      message: message.trim()
    });

    // Send in-app notification to recipient if identified
    if (newMsg.recipientId) {
      await notificationRepository.createNotification({
        userId: newMsg.recipientId,
        type: 'NEW_CHAT_MESSAGE',
        title: `New Message from ${req.user.first_name}`,
        message: message.trim().slice(0, 90),
        linkUrl: `/portal/chat?conversationId=${req.params.id}`,
        metadata: { conversationId: req.params.id, senderId: req.user.id }
      });
    }

    return successResponse(res, newMsg, 'Message sent', 201);
  } catch (err) {
    next(err);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const unread = await chatRepository.getUnreadChatCount(req.user.id);
    return successResponse(res, { unread }, 'Unread count retrieved');
  } catch (err) {
    next(err);
  }
}

async function getContacts(req, res, next) {
  try {
    const contacts = await chatRepository.getAvailableContacts(req.user.id);
    return successResponse(res, contacts, 'Contacts retrieved');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getConversations,
  startConversation,
  getMessages,
  sendMessage,
  getUnreadCount,
  getContacts
};
