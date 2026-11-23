const API_BASE = '/api';

export const getToken = () => localStorage.getItem('token');
export const setToken = (t) => {
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
};

export async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(API_BASE + endpoint, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error || (data.message ? data.message : 'Request failed');
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export async function uploadFile(endpoint, formData) {
  const token = getToken();
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const res = await fetch(API_BASE + endpoint, {
    method: 'POST',
    body: formData,
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'File upload failed');
  }
  return data;
}
