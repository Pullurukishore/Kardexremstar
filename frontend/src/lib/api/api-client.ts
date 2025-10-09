import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

// Cookie helper function
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift();
    return cookieValue || null;
  }
  return null;
};

// Token management helpers
const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    // Check localStorage first for backward compatibility
    const localStorageToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (localStorageToken) {
      return localStorageToken;
    }
    
    // Fallback to cookies (same pattern as AuthContext)
    const cookieToken = getCookie('accessToken') || getCookie('token') || 
                       localStorage.getItem('cookie_accessToken');
    return cookieToken;
  }
  return null;
};

const setToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', token);
  }
};

const removeToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
};
import { toast } from 'sonner';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

export type QueryKey = string | readonly unknown[];

export interface ApiHookOptions {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  retry?: number | boolean;
  staleTime?: number;
  cacheTime?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

class ApiClient {
  private static instance: ApiClient;
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  private constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = getToken();
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        } else {
          console.warn('No access token found in local storage');
        }
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as any;
        
        // If error is not 401 or it's a refresh token request, reject
        if (error.response?.status !== 401 || originalRequest._retry) {
          // Check if request wants to skip global error handling
          if (!originalRequest.headers?.['X-Skip-Global-Error-Handler']) {
            this.handleError(error);
          }
          return Promise.reject(error);
        }

        // If we're already refreshing the token, add to queue
        if (this.isRefreshing) {
          return new Promise((resolve, reject) => {
            this.refreshSubscribers.push((token: string) => {
              if (token) {
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
                resolve(this.client(originalRequest));
              } else {
                reject(new Error('Failed to refresh token'));
                this.logout();
              }
            });
          });
        }

        // Set refresh flag and try to refresh token
        originalRequest._retry = true;
        this.isRefreshing = true;

        try {
          const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }
          const { data } = await this.client.post<ApiResponse<{ accessToken: string }>>(
            '/auth/refresh-token',
            { refreshToken }
          );

          if (data.success && data.data?.accessToken) {
            const { accessToken } = data.data;
            setToken(accessToken);

            // Update Authorization header
            this.client.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

            // Process queued requests
            this.processQueue(null, accessToken);

            // Retry the original request
            return this.client(originalRequest);
          }
          throw new Error('Failed to refresh token');
        } catch (refreshError) {
          // If refresh fails, redirect to login
          this.processQueue(new Error('Failed to refresh token'));
          this.logout();
          return Promise.reject(refreshError);
        } finally {
          this.isRefreshing = false;
        }
      }
    );
  }

  private processQueue(error: Error | null, token: string | null = null): void {
    this.refreshSubscribers.forEach((callback) => callback(token as string));
    this.refreshSubscribers = [];
  }

  private handleError(error: AxiosError<ApiError>): void {
    if (error.response) {
      const { status, data } = error.response;
      const errorMessage = data?.message || 'An error occurred';
      
      if (status >= 500) {
        toast.error('Server error. Please try again later.');
      } else if (status === 401) {
        toast.error('Session expired. Please log in again.');
        this.logout();
      } else if (status === 403) {
        toast.error('You do not have permission to perform this action.');
      } else if (status === 404) {
        toast.error('The requested resource was not found.');
      } else if (status === 400) {
        toast.error(errorMessage);
      }
    } else if (error.request) {
      toast.error('No response from server. Please check your connection.');
    } else {
      toast.error('An unexpected error occurred.');
    }
  }

  public logout(redirectToLogin: boolean = true): void {
    removeToken();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userRole');
      localStorage.removeItem('user');
      if (redirectToLogin) {
        window.location.href = '/login';
      }
    }
  }

  // HTTP Methods
  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  public async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  public async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  public async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  public async upload<T = any>(
    url: string,
    file: File,
    fieldName = 'file',
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append(fieldName, file);

    const response = await this.client.post<ApiResponse<T>>(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }
}

// Create and export a singleton instance
export const apiClient = ApiClient.getInstance();

export default apiClient;
