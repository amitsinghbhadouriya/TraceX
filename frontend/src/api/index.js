import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Automatically inject JWT token from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tracex_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Clean up stale token on 401 Unauthorized (except on login / register attempts)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthAttempt = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
      if (!isAuthAttempt) {
        localStorage.removeItem('tracex_token');
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (name, email, password, role) => api.post('/auth/register', { name, email, password, role }),
  getMe: () => api.get('/auth/me'),
};

export const datasetApi = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: () => api.get('/datasets'),
  getById: (id) => api.get(`/datasets/${id}`),
  delete: (id) => api.delete(`/datasets/${id}`),
};

export const analysisApi = {
  run: (datasetId) => api.post(`/analysis/run/${datasetId}`),
  getResults: (datasetId) => api.get(`/analysis/results/${datasetId}`),
};

export const graphApi = {
  getGraph: (sessionId) => api.get(`/graph/nodes/${sessionId}`),
  getClusters: (sessionId) => api.get(`/graph/clusters/${sessionId}`),
  getEntity: (sessionId, entityId) => api.get(`/graph/entity/${sessionId}/${entityId}`),
  getSummary: (sessionId) => api.get(`/graph/summary/${sessionId}`),
  chat: (sessionId, message) => api.post(`/graph/chat/${sessionId}`, { message }),
  getChatHistory: (sessionId) => api.get(`/graph/chat-history/${sessionId}`),
};

export default api;
