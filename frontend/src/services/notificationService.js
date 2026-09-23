import { apiRequest } from './api';

export const notificationService = {
  async getNotifications(page = 1, limit = 20, isRead = undefined) {
    const params = new URLSearchParams({ page, limit });
    if (typeof isRead === 'boolean') {
      params.append('isRead', isRead);
    }
    const res = await apiRequest(`/notifications?${params.toString()}`);
    return {
      notifications: res.data || [],
      meta: res.meta || {}
    };
  },

  async getUnreadCount() {
    const res = await apiRequest('/notifications/unread-count');
    return res.data?.unreadCount || 0;
  },

  async markAsRead(id) {
    const res = await apiRequest(`/notifications/${id}/read`, {
      method: 'PATCH'
    });
    return res.data;
  },

  async markAllAsRead() {
    const res = await apiRequest('/notifications/read-all', {
      method: 'PATCH'
    });
    return res.data;
  },

  async deleteNotification(id) {
    const res = await apiRequest(`/notifications/${id}`, {
      method: 'DELETE'
    });
    return res.data;
  }
};
