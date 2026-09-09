// Core HTTP client for LabGuard API requests

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

async function request(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    let json;
    try {
      json = await response.json();
    } catch (e) {
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }
      throw new Error('Invalid JSON response');
    }

    if (!response.ok) {
      throw new Error(json.error || 'API request failed');
    }

    if (json.success === false) {
      throw new Error(json.error || 'API request failed');
    }

    return json.data;
  } catch (error) {
    if (error.name === 'TypeError' || error.message === 'Failed to fetch') {
      throw new Error('Unable to connect to LabGuard server');
    }
    throw error;
  }
}

export function apiGet(endpoint, params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      query.append(key, value);
    }
  }
  const queryString = query.toString();
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;
  return request(url, { method: 'GET' });
}

export function apiPost(endpoint, body) {
  return request(endpoint, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export function apiPatch(endpoint, body) {
  return request(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
}
