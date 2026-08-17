const API = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const prefix = path.startsWith('/ai') ? '' : API;
  const res = await fetch(`${prefix}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de conexión' }));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return res.json();
}

export const auth = {
  login: (email, password) => request('/users/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name, email, password) => request('/users/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  me: () => request('/users/me'),
};

export const categories = {
  list: () => request('/categories'),
  create: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
};

export const transactions = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/transactions${q ? '?' + q : ''}`);
  },
  dashboard: (month, year) => request(`/transactions/dashboard?month=${month}&year=${year}`),
  previousBalance: (month, year) => request(`/transactions/previous-balance?month=${month}&year=${year}`),
  create: (data) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),
};

export const budgets = {
  list: (month, year) => request(`/budgets?month=${month}&year=${year}`),
  create: (data) => request('/budgets', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/budgets/${id}`, { method: 'DELETE' }),
};

export const savings = {
  list: () => request('/savings'),
  create: (data) => request('/savings', { method: 'POST', body: JSON.stringify(data) }),
  deposit: (id, amount) => request(`/savings/${id}/deposit`, { method: 'POST', body: JSON.stringify({ amount }) }),
  withdraw: (id, amount) => request(`/savings/${id}/withdraw`, { method: 'POST', body: JSON.stringify({ amount }) }),
  movements: (id) => request(`/savings/${id}/transactions`),
  update: (id, data) => request(`/savings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/savings/${id}`, { method: 'DELETE' }),
};

export const alerts = {
  list: () => request('/alerts'),
  check: (month, year) => request('/alerts/check', { method: 'POST', body: JSON.stringify({ month, year }) }),
  markRead: (id) => request(`/alerts/${id}/read`, { method: 'PUT' }),
  markAllRead: () => request('/alerts/read-all', { method: 'POST' }),
};

export const chatbot = {
  send: (message) => request('/ai/chatbot/message', { method: 'POST', body: JSON.stringify({ message }) }),
  clear: () => request('/ai/chatbot/clear', { method: 'POST' }),
};

export const exportFile = (format, params = {}) => {
  const token = getToken();
  const q = new URLSearchParams(params).toString();
  return fetch(`${API}/export/${format}${q ? '?' + q : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};


