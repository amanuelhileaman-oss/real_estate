/**
 * Centralized API Client with JWT Bearer attachment and Automatic Refresh Token Retry
 */

let accessToken = localStorage.getItem('realestate_access_token') || null;

export function setAccessToken(token) {
  accessToken = token;
  if (token) {
    localStorage.setItem('realestate_access_token', token);
  } else {
    localStorage.removeItem('realestate_access_token');
  }
}

export function getAccessToken() {
  return accessToken;
}

export async function apiRequest(endpoint, options = {}) {
  // Use VITE_API_BASE_URL for production (e.g. https://my-backend.onrender.com) 
  // If not set, it defaults to '' (which uses the local Vite proxy in development)
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const url = `${baseUrl}${endpoint.startsWith('/') ? '/api/v1' + endpoint : '/api/v1/' + endpoint}`;

  const headers = {
    ...options.headers
  };

  // If not FormData, default to application/json
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include' // Sends HttpOnly refreshToken cookie
  });

  // Handle 401 Unauthorized -> attempt silent refresh once
  if (response.status === 401 && !options._retry && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh-token')) {
    options._retry = true;
    try {
      const refreshRes = await fetch(`${baseUrl}/api/v1/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      let refreshData = null;
      try {
        const refreshText = await refreshRes.text();
        refreshData = refreshText ? JSON.parse(refreshText) : null;
      } catch {
        refreshData = null;
      }

      if (refreshData && refreshData.success && refreshData.data?.accessToken) {
        setAccessToken(refreshData.data.accessToken);
        headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
        response = await fetch(url, { ...options, headers, credentials: 'include' });
      } else {
        setAccessToken(null);
      }
    } catch (refreshErr) {
      setAccessToken(null);
    }
  }

  let data = null;
  const rawText = await response.text();
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = {
      success: false,
      message: rawText && rawText.length < 200 ? rawText : `Server returned status ${response.status} (${response.statusText || 'Error'})`
    };
  }

  if (!response.ok || data.success === false) {
    let message = data.error?.message || data.message || `Request failed with status ${response.status}`;

    // Format field-level validation errors for clear UI feedback
    if (data.error?.details) {
      if (Array.isArray(data.error.details) && data.error.details.length > 0) {
        const fieldIssues = data.error.details
          .map((d) => {
            const fieldName = d.field ? d.field.replace(/^body\./, '') : '';
            return fieldName ? `${fieldName}: ${d.message}` : d.message;
          })
          .filter(Boolean)
          .join('; ');
        if (fieldIssues) {
          message = `${message} (${fieldIssues})`;
        }
      } else if (typeof data.error.details === 'string') {
        message = `${message}: ${data.error.details}`;
      }
    }

    const error = new Error(message);
    error.statusCode = response.status;
    error.code = data.error?.code;
    error.details = data.error?.details;
    throw error;
  }

  return data;
}
