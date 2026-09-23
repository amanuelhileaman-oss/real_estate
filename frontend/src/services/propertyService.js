import { apiRequest } from './api';

export const propertyService = {
  async getProperties(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    const queryStr = searchParams.toString();
    const endpoint = queryStr ? `/properties?${queryStr}` : '/properties';
    const res = await apiRequest(endpoint);
    return { properties: res.data, meta: res.meta };
  },

  async getGeoRadius(lat, lng, radius = 25, type = '', listingType = '') {
    const params = new URLSearchParams({ lat, lng, radius });
    if (type) params.append('type', type);
    if (listingType) params.append('listingType', listingType);
    const res = await apiRequest(`/properties/geo/radius?${params.toString()}`);
    return res.data;
  },

  async getGeoBounds(minLng, minLat, maxLng, maxLat) {
    const params = new URLSearchParams({ minLng, minLat, maxLng, maxLat });
    const res = await apiRequest(`/properties/geo/bounds?${params.toString()}`);
    return res.data;
  },

  async getPropertyDetails(slugOrId) {
    const res = await apiRequest(`/properties/${slugOrId}`);
    return res.data;
  },

  async createProperty(propertyData) {
    const res = await apiRequest('/properties', {
      method: 'POST',
      body: JSON.stringify(propertyData)
    });
    return res.data;
  },

  async updateProperty(id, propertyData) {
    const res = await apiRequest(`/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(propertyData)
    });
    return res.data;
  },

  async changeStatus(id, status, rejectionReason = null) {
    const res = await apiRequest(`/properties/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, rejectionReason })
    });
    return res.data;
  },

  async changeAvailabilityStatus(id, availabilityStatus) {
    const res = await apiRequest(`/properties/${id}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ availabilityStatus })
    });
    return res.data;
  },

  async deleteProperty(id) {
    const res = await apiRequest(`/properties/${id}`, {
      method: 'DELETE'
    });
    return res.data;
  },

  async uploadMedia(propertyId, formData) {
    const res = await apiRequest(`/properties/${propertyId}/media`, {
      method: 'POST',
      body: formData
    });
    return res.data;
  },

  async reorderMedia(propertyId, mediaOrders) {
    const res = await apiRequest(`/properties/${propertyId}/media/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ mediaOrders })
    });
    return res.data;
  },

  async deleteMedia(propertyId, mediaId) {
    const res = await apiRequest(`/properties/${propertyId}/media/${mediaId}`, {
      method: 'DELETE'
    });
    return res.data;
  },

  async getLookups() {
    const res = await apiRequest('/properties/lookups');
    return res.data;
  },

  async toggleFavorite(propertyId) {
    const res = await apiRequest(`/favorites/${propertyId}`, { method: 'POST' });
    return res.data;
  },

  async getFavorites(page = 1, limit = 12) {
    const res = await apiRequest(`/favorites?page=${page}&limit=${limit}`);
    return { properties: res.data, meta: res.meta };
  },

  async reportProperty(propertyId, reportType, reason) {
    const res = await apiRequest('/reports', {
      method: 'POST',
      body: JSON.stringify({ propertyId, reportType, reason })
    });
    return res.data;
  }
};
