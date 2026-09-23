const notificationRepository = require('../repositories/notificationRepository');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const { NotFoundError } = require('../utils/appError');

async function getNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const isRead = req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined;

    const { notifications, total, unreadCount } = await notificationRepository.getUserNotifications(userId, {
      isRead,
      page,
      limit
    });

    return res.status(200).json({
      success: true,
      message: 'Notifications retrieved',
      data: notifications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        unreadCount
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const unreadCount = await notificationRepository.getUnreadCount(req.user.id);
    return successResponse(res, { unreadCount }, 'Unread count retrieved');
  } catch (err) {
    next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const updated = await notificationRepository.markAsRead(notificationId, userId);
    if (!updated) {
      throw new NotFoundError('Notification not found or unauthorized.');
    }

    return successResponse(res, updated, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    const count = await notificationRepository.markAllAsRead(req.user.id);
    return successResponse(res, { count }, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
}

async function deleteNotification(req, res, next) {
  try {
    const deleted = await notificationRepository.deleteNotification(req.params.id, req.user.id);
    if (!deleted) {
      throw new NotFoundError('Notification not found or unauthorized.');
    }

    return successResponse(res, { deleted: true }, 'Notification deleted');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
