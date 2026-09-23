import { apiRequest } from './api';

export const adminService = {
  async getAnalytics() {
    const res = await apiRequest('/admin/analytics');
    return res.data;
  },

  async getModerationQueue(page = 1, limit = 20) {
    const res = await apiRequest(`/admin/moderation?page=${page}&limit=${limit}`);
    return { properties: res.data, meta: res.meta };
  },

  async approveListing(propertyId) {
    const res = await apiRequest(`/admin/properties/${propertyId}/approve`, {
      method: 'PATCH'
    });
    return res.data;
  },

  async rejectListing(propertyId, reason) {
    const res = await apiRequest(`/admin/properties/${propertyId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason })
    });
    return res.data;
  },

  async getAllProperties(params = {}) {
    const searchParams = new URLSearchParams(params);
    const res = await apiRequest(`/admin/properties?${searchParams.toString()}`);
    return { properties: res.data, meta: res.meta };
  },

  async getUsers(params = {}) {
    const searchParams = new URLSearchParams(params);
    const res = await apiRequest(`/admin/users?${searchParams.toString()}`);
    return { users: res.data, meta: res.meta };
  },

  async setUserStatus(userId, isActive) {
    const res = await apiRequest(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive })
    });
    return res.data;
  },

  async updateUser(userId, userData) {
    const res = await apiRequest(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
    return res.data;
  },

  async deleteUser(userId) {
    const res = await apiRequest(`/admin/users/${userId}`, {
      method: 'DELETE'
    });
    return res.data;
  },

  async updateProperty(propertyId, propertyData) {
    const res = await apiRequest(`/admin/properties/${propertyId}`, {
      method: 'PUT',
      body: JSON.stringify(propertyData)
    });
    return res.data;
  },

  async deleteProperty(propertyId) {
    const res = await apiRequest(`/admin/properties/${propertyId}`, {
      method: 'DELETE'
    });
    return res.data;
  },

  async changePropertyStatus(propertyId, status, reason = null) {
    const res = await apiRequest(`/admin/properties/${propertyId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason })
    });
    return res.data;
  },

  async getPropertyDetails(propertyId) {
    const res = await apiRequest(`/admin/properties/${propertyId}`);
    return res.data;
  },

  async getAgents(params = {}) {
    const searchParams = new URLSearchParams(params);
    const res = await apiRequest(`/admin/agents?${searchParams.toString()}`);
    return { agents: res.data, meta: res.meta };
  },

  async verifyAgent(agentId, isVerified) {
    const res = await apiRequest(`/admin/agents/${agentId}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ isVerified })
    });
    return res.data;
  },

  async getReports(params = {}) {
    const searchParams = new URLSearchParams(params);
    const res = await apiRequest(`/admin/reports?${searchParams.toString()}`);
    return { reports: res.data, meta: res.meta };
  },

  async updateReport(reportId, status, adminNotes = null) {
    const res = await apiRequest(`/admin/reports/${reportId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, adminNotes })
    });
    return res.data;
  }
};
