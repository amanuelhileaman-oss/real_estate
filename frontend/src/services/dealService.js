import { apiRequest } from './api';

export const dealService = {
  async createDeal(dealData) {
    const res = await apiRequest('/deals', {
      method: 'POST',
      body: JSON.stringify(dealData)
    });
    return res.data;
  },

  async getCustomerDeals(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/deals/my-deals?${query}` : '/deals/my-deals';
    const res = await apiRequest(endpoint);
    return res.data || [];
  },

  async getAgentDeals(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/deals/agent-deals?${query}` : '/deals/agent-deals';
    const res = await apiRequest(endpoint);
    return res.data || [];
  },

  async getDealById(id) {
    const res = await apiRequest(`/deals/${id}`);
    return res.data;
  },

  async updateDealStatus(id, { status, counterAmount, agentNotes, customerNotes }) {
    const res = await apiRequest(`/deals/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, counterAmount, agentNotes, customerNotes })
    });
    return res.data;
  }
};
