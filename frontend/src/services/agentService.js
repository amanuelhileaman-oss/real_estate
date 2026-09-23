import { apiRequest } from './api';

export const agentService = {
  async getAgents(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    const queryStr = searchParams.toString();
    const endpoint = queryStr ? `/agents?${queryStr}` : '/agents';
    const res = await apiRequest(endpoint);
    return { agents: res.data, meta: res.meta };
  },

  async getAgentProfile(agentId) {
    const res = await apiRequest(`/agents/profile/${agentId}`);
    return res.data;
  },

  async getMyListings(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    const queryStr = searchParams.toString();
    const endpoint = queryStr ? `/agents/my-listings?${queryStr}` : '/agents/my-listings';
    const res = await apiRequest(endpoint);
    return { properties: res.data, meta: res.meta };
  }
};
