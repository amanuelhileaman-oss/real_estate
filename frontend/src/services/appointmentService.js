import { apiRequest } from './api';

export const appointmentService = {
  async requestViewing(data) {
    const res = await apiRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async getMyAppointments() {
    const res = await apiRequest('/appointments/my');
    return res.data;
  },

  async getAgentAppointments() {
    const res = await apiRequest('/appointments/agent');
    return res.data;
  },

  async updateStatus(id, payload) {
    const res = await apiRequest(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    return res.data;
  }
};
