import { apiRequest } from './api';

export const inquiryService = {
  async submitInquiry(data) {
    const res = await apiRequest('/inquiries', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async getAgentInquiries(status = null, page = 1, limit = 20) {
    const params = new URLSearchParams({ page, limit });
    if (status) params.append('status', status);
    const res = await apiRequest(`/inquiries/agent?${params.toString()}`);
    return { inquiries: res.data, meta: res.meta };
  },

  async getMyInquiries(page = 1, limit = 20) {
    const params = new URLSearchParams({ page, limit });
    const res = await apiRequest(`/inquiries/my?${params.toString()}`);
    return { inquiries: res.data, meta: res.meta };
  },

  async updateStatus(id, status) {
    const res = await apiRequest(`/inquiries/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    return res.data;
  }
};
