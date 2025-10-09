import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getCookie, setCookie, deleteCookie } from 'cookies-next';
import { isTokenExpired } from '@/services/auth.service';
import { API_BASE_URL } from '../constants';

export class ApiError extends Error {
  status: number;
  data: any;
  
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 15000, // 15 second timeout to prevent hanging requests
});

// Request interceptor to add auth token and handle token refresh
api.interceptors.request.use(
  async (config) => {
    const accessToken = getCookie('accessToken');
    const token = getCookie('token');
    
    // Use fallback token logic like other parts of the app
    const authToken = accessToken || token;
    
    if (authToken) {
      // Check if token is expired or about to expire
      if (isTokenExpired(authToken)) {
        try {
          // Skip if already refreshing to prevent multiple refresh attempts (client-side only)
          if (typeof window !== 'undefined' && !window.__isRefreshing) {
            window.__isRefreshing = true;
            const response = await axios.post(
              `${API_BASE_URL}/auth/refresh-token`,
              {},
              { withCredentials: true }
            );
            
            if (response.data.accessToken) {
              setCookie('accessToken', response.data.accessToken);
              config.headers.Authorization = `Bearer ${response.data.accessToken}`;
              
              // Set userRole cookie if provided in response
              if (response.data.user?.role) {
                setCookie('userRole', response.data.user.role);
              }
            }
          }
        } catch (error) {
          // If refresh fails, clear tokens and redirect to login (client-side only)
          deleteCookie('accessToken');
          if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
            window.location.href = '/auth/login';
          }
          return Promise.reject(error);
        } finally {
          if (typeof window !== 'undefined') {
            window.__isRefreshing = false;
          }
        }
      } else {
        config.headers.Authorization = `Bearer ${authToken}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add global type for refresh flag
declare global {
  interface Window {
    __isRefreshing: boolean;
  }
}

// Initialize refresh flag
if (typeof window !== 'undefined') {
  window.__isRefreshing = false;
}

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    
    // Don't intercept if the request is for login or refresh-token endpoints
    if (originalRequest.url?.includes('/auth/login') || 
        originalRequest.url?.includes('/auth/refresh-token')) {
      return Promise.reject(error);
    }

    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If we're already on the login page, don't try to refresh (client-side only)
      if (typeof window !== 'undefined' && window.location.pathname === '/auth/login') {
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;

      try {
        // Get refresh token from httpOnly cookie (handled automatically with credentials)
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          {},
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        const { accessToken } = response.data;
        if (accessToken) {
          // Update the authorization header for the original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          // Retry the original request with new token
          return api(originalRequest);
        }
        throw new Error('No access token in response');
      } catch (error) {
        // Clear any existing tokens (client-side only)
        if (typeof window !== 'undefined') {
          deleteCookie('accessToken');
          // Don't delete refreshToken cookie as it's httpOnly
          
          // Only redirect to login if not already there
          if (window.location.pathname !== '/auth/login') {
            window.location.href = '/auth/login';
          }
        }
        return Promise.reject(error);
      }
    }

    // For 403 Forbidden, do NOT auto-redirect; allow callers to surface errors
    // This prevents losing context (e.g., while generating reports)

    return Promise.reject(error);
  }
);

export default api;
