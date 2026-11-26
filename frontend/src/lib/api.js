const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

let csrfToken = '';

export class ApiError extends Error {
  constructor(message, status = 0, code = 'REQUEST_FAILED', details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function setCsrfToken(token) {
  csrfToken = token || '';
}

export function getCsrfToken() {
  return csrfToken;
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

async function request(path, { method = 'GET', body, authRetry = true } = {}) {
  const headers = { Accept: 'application/json' };
  const isUnsafe = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (isUnsafe && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    console.error('API connection failed:', err, 'Path:', `${API_BASE}${path}`);
    throw new ApiError(
      'Cannot reach the API server. Confirm the PHP server is running.',
      0,
      'NETWORK_ERROR',
      err?.message || null,
    );
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.status === 'error') {
    const error = payload?.error || {};
    const apiError = new ApiError(
      error.message || `Request failed with HTTP ${response.status}.`,
      response.status,
      error.code || 'REQUEST_FAILED',
      error.details || null,
    );

    if (response.status === 401 && !path.startsWith('/auth/login')) {
      window.dispatchEvent(new CustomEvent('skilltrack:unauthorized'));
    }

    // Refresh CSRF token when a cookie session exists but token expired.
    if (response.status === 403 && apiError.code === 'CSRF_INVALID' && authRetry) {
      try {
        const refreshed = await request('/auth/csrf', { method: 'GET' });
        setCsrfToken(refreshed?.csrf_token);
        return await request(path, { method, body, authRetry: false });
      } catch {
        // Fall through and surface the original error.
      }
    }

    throw apiError;
  }

  return payload?.data ?? null;
}

export const api = {
  get(path, params) {
    return request(`${path}${buildQuery(params)}`);
  },
  post(path, body) {
    return request(path, { method: 'POST', body: body ?? {} });
  },
  put(path, body) {
    return request(path, { method: 'PUT', body: body ?? {} });
  },
  patch(path, body) {
    return request(path, { method: 'PATCH', body: body ?? {} });
  },
  delete(path) {
    return request(path, { method: 'DELETE' });
  },
  login(identity, password) {
    return request('/auth/login', { method: 'POST', body: { identity, password } });
  },
  me() {
    return request('/auth/me');
  },
  logout() {
    return request('/auth/logout', { method: 'POST', body: {} });
  },
  health() {
    return request('/health');
  },
};
