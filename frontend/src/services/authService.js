import { apiRequest, setAccessToken } from './api';

export const authService = {
  async register(payload) {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res.data?.accessToken) {
      setAccessToken(res.data.accessToken);
    }
    return res.data;
  },

  async login(email, password) {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.data?.accessToken) {
      setAccessToken(res.data.accessToken);
    }
    return res.data;
  },

  async googleAuth(payload) {
    const res = await apiRequest('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res.data?.accessToken) {
      setAccessToken(res.data.accessToken);
    }
    return res.data;
  },


  async logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      setAccessToken(null);
    }
  },

  async getMe() {
    const res = await apiRequest('/auth/me');
    return res.data;
  },

  async updateProfile(payload) {
    const isFormData = payload instanceof FormData;
    const res = await apiRequest('/auth/me', {
      method: 'PUT',
      body: isFormData ? payload : JSON.stringify(payload)
    });
    return res.data;
  }
};
