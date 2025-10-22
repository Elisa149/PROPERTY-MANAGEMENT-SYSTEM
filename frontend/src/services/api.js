import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Try to refresh token
      try {
        // Get fresh token from Firebase
        const auth = (await import('../config/firebase')).auth;
        const currentUser = auth.currentUser;
        
        if (currentUser) {
          console.log('🔄 Token expired, attempting refresh...');
          const newToken = await currentUser.getIdToken(true);
          
          // Update token for future requests
          setAuthToken(newToken);
          
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } else {
          // No user, redirect to login
          console.log('❌ No user found, redirecting to login');
          window.location.href = '/login';
          return Promise.reject(error);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Clear token and redirect to login
        setAuthToken(null);
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    
    const message = error.response?.data?.error || error.message || 'An error occurred';
    
    // Don't show toast for 401 errors (handled above)
    if (error.response?.status !== 401) {
      toast.error(message);
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  verifyToken: () => api.post('/auth/verify'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  requestAccess: (data) => api.post('/auth/request-access', data),
  getOrganizations: () => api.get('/auth/organizations'),
  getOrgRoles: (orgId) => api.get(`/auth/organizations/${orgId}/roles`),
  getAccessRequests: () => api.get('/auth/access-requests'),
  respondToRequest: (requestId, data) => api.post(`/auth/access-requests/${requestId}/respond`, data),
};

export const propertiesAPI = {
  getAll: () => api.get('/properties'),
  getById: (id) => api.get(`/properties/${id}`),
  create: (data) => api.post('/properties', data),
  update: (id, data) => api.put(`/properties/${id}`, data),
  delete: (id) => api.delete(`/properties/${id}`),
  getStats: (id) => api.get(`/properties/${id}/stats`),
};

export const rentAPI = {
  getAll: () => api.get('/rent'),
  getById: (id) => api.get(`/rent/${id}`),
  getByProperty: (propertyId) => api.get(`/rent/property/${propertyId}`),
  create: (data) => api.post('/rent', data),
  update: (id, data) => api.put(`/rent/${id}`, data),
  delete: (id) => api.delete(`/rent/${id}`),
};

export const paymentsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/payments${query ? `?${query}` : ''}`);
  },
  getById: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post('/payments', data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  delete: (id) => api.delete(`/payments/${id}`),
  getDashboardSummary: () => api.get('/payments/dashboard/summary'),
  getStats: () => api.get('/payments/stats'),
};

export const tenantsAPI = {
  getAll: () => api.get('/tenants'),
  getById: (id) => api.get(`/tenants/${id}`),
  create: (data) => api.post('/tenants', data),
  update: (id, data) => api.put(`/tenants/${id}`, data),
  delete: (id) => api.delete(`/tenants/${id}`),
  getByProperty: (propertyId) => api.get(`/tenants/property/${propertyId}`),
};

export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  updateProfile: (id, data) => api.put(`/users/${id}/profile`, data),
  updateRole: (id, data) => api.put(`/users/${id}/role`, data),
};

export default api;
