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

// Track refresh promise to prevent multiple simultaneous refresh attempts
let refreshTokenPromise: Promise<string> | null = null;

// Request interceptor to add auth token and handle token refresh
api.interceptors.request.use(
  async (config) => {
    // Skip token refresh for auth endpoints
    if (config.url?.includes('/auth/login') || 
        config.url?.includes('/auth/refresh-token')) {
      return config;
    }

    const accessToken = getCookie('accessToken');
    const token = getCookie('token');
    
    // Use fallback token logic like other parts of the app
    const authToken = accessToken || token;
    
    if (authToken) {
      // Check if token is expired or about to expire (within 5 minutes)
      if (isTokenExpired(authToken)) {
        console.log('[Axios] Token expired or expiring soon, refreshing...');
        
        try {
          // Reuse existing refresh promise if one is in flight
          if (!refreshTokenPromise) {
            console.log('[Axios] Starting new token refresh');
            refreshTokenPromise = (async () => {
              try {
                const response = await axios.post(
                  `${API_BASE_URL}/auth/refresh-token`,
                  {},
                  { withCredentials: true }
                );
                
                if (response.data?.success && response.data.accessToken) {
                  console.log('[Axios] Token refresh successful');
                  setCookie('accessToken', response.data.accessToken);
                  setCookie('token', response.data.accessToken);
                  
                  // Update refresh token if rotated
                  if (response.data.refreshToken) {
                    setCookie('refreshToken', response.data.refreshToken);
                  }
                  
                  // Set userRole cookie if provided in response
                  if (response.data.user?.role) {
                    setCookie('userRole', response.data.user.role);
                  }
                  
                  return response.data.accessToken;
                } else {
                  throw new Error('No access token in refresh response');
                }
              } finally {
                // Clear the promise after completion (success or failure)
                refreshTokenPromise = null;
              }
            })();
          } else {
            console.log('[Axios] Reusing existing token refresh promise');
          }
          
          // Wait for the refresh to complete
          const newToken = await refreshTokenPromise;
          config.headers.Authorization = `Bearer ${newToken}`;
          
        } catch (error: any) {
          console.error('[Axios] Token refresh failed:', error?.response?.data || error.message);
          
          // Clear tokens on refresh failure
          deleteCookie('accessToken');
          deleteCookie('token');
          deleteCookie('refreshToken');
          
          // Redirect to login (client-side only)
          if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
            // Show user-friendly message
            const errorCode = error?.response?.data?.code;
            if (errorCode === 'REFRESH_TOKEN_EXPIRED') {
              console.log('[Axios] Session expired, redirecting to login');
              // Store a flag to show session expired message
              if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem('sessionExpired', 'true');
              }
            }
            window.location.href = '/auth/login';
          }
          
          return Promise.reject(error);
        }
      } else {
        // Token is still valid, use it
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
      console.log('[Axios Response] Got 401 error, attempting token refresh');
      
      // If we're already on the login page, don't try to refresh (client-side only)
      if (typeof window !== 'undefined' && window.location.pathname === '/auth/login') {
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;

      try {
        // Reuse the refresh token promise if one is in flight
        if (!refreshTokenPromise) {
          console.log('[Axios Response] Starting token refresh from 401 handler');
          refreshTokenPromise = (async () => {
            try {
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
              
              if (response.data?.success && response.data.accessToken) {
                console.log('[Axios Response] Token refresh successful');
                setCookie('accessToken', response.data.accessToken);
                setCookie('token', response.data.accessToken);
                
                // Update refresh token if rotated
                if (response.data.refreshToken) {
                  setCookie('refreshToken', response.data.refreshToken);
                }
                
                // Set userRole cookie if provided
                if (response.data.user?.role) {
                  setCookie('userRole', response.data.user.role);
                }
                
                return response.data.accessToken;
              }
              throw new Error('No access token in response');
            } finally {
              refreshTokenPromise = null;
            }
          })();
        } else {
          console.log('[Axios Response] Reusing existing refresh promise');
        }
        
        const newToken = await refreshTokenPromise;
        
        // Update the authorization header for the original request
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        // Retry the original request with new token
        console.log('[Axios Response] Retrying original request with new token');
        return api(originalRequest);
        
      } catch (refreshError: any) {
        console.error('[Axios Response] Token refresh failed:', refreshError?.response?.data || refreshError.message);
        
        // Clear any existing tokens (client-side only)
        if (typeof window !== 'undefined') {
          deleteCookie('accessToken');
          deleteCookie('token');
          deleteCookie('refreshToken');
          
          // Check error code for user-friendly messaging
          const errorCode = refreshError?.response?.data?.code;
          if (errorCode === 'REFRESH_TOKEN_EXPIRED' || errorCode === 'NO_REFRESH_TOKEN') {
            console.log('[Axios Response] Session expired, storing flag');
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem('sessionExpired', 'true');
              sessionStorage.setItem('sessionExpiredReason', errorCode);
            }
          }
          
          // Only redirect to login if not already there
          if (window.location.pathname !== '/auth/login') {
            console.log('[Axios Response] Redirecting to login');
            window.location.href = '/auth/login';
          }
        }
        
        return Promise.reject(refreshError);
      }
    }

    // For 403 Forbidden, do NOT auto-redirect; allow callers to surface errors
    // This prevents losing context (e.g., while generating reports)

    return Promise.reject(error);
  }
);

export default api;
