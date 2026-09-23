import { apiRequest } from './api';

export const chatService = {
  async getConversations() {
    const res = await apiRequest('/chat/conversations');
    return res.data || [];
  },

  async startConversation(data) {
    const res = await apiRequest('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async getMessages(conversationId) {
    const res = await apiRequest(`/chat/conversations/${conversationId}/messages`);
    return res.data || [];
  },

  async sendMessage(conversationId, message) {
    const res = await apiRequest(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
    return res.data;
  },

  async getUnreadCount() {
    const res = await apiRequest('/chat/unread-count');
    return res.data?.unread || 0;
  },

  async getContacts() {
    const res = await apiRequest('/chat/contacts');
    return res.data || [];
  }
};
