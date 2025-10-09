import { UserRole } from '@/types/user.types';
import api from '@/lib/api/axios';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
  role: UserRole;
  companyName?: string;
  zoneId?: string;
}

export interface AuthResponseUser {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
  phone?: string | null;
  zoneId?: string | null;
  customerId?: string | null;
  companyName?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
  isActive?: boolean;
  refreshToken?: string | null;
  refreshTokenExpires?: string | null;
  tokenVersion?: string;
  otp?: string | null;
  otpExpiresAt?: string | null;
  failedLoginAttempts?: number;
  accountLockedUntil?: string | null;
  lastFailedLogin?: string | null;
  lastPasswordChange?: string;
  passwordResetToken?: string | null;
  passwordResetExpires?: string | null;
  lastActiveAt?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  customer?: any | null;
  token?: string;
  accessToken?: string;
}

export interface AuthResponse {
  user: AuthResponseUser;
  accessToken: string;
  refreshToken?: string;
}

// Check if token is expired or about to expire (within 5 minutes)
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;
    const buffer = 300; // 5 minutes in seconds
    return payload.exp < (now + buffer);
  } catch (e) {
    return true; // If we can't parse the token, assume it's expired
  }
};

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', userData);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  getCurrentUser: async (): Promise<AuthResponseUser> => {
    const { data } = await api.get<AuthResponseUser>('/auth/me');

    console.log('AuthService - getCurrentUser - Raw data from server:', data);

    // Ensure consistent name handling with better validation
    let userName = data.name?.trim();
    
    // Check if name is valid and not a placeholder
    if (!userName || userName === '' || userName === 'null' || userName === 'undefined' || userName === 'User') {
      userName = data.email?.split('@')[0] || 'User';
    }

    console.log('AuthService - getCurrentUser - Processed name:', userName);

    const processedUser = {
      ...data,
      name: userName,
      isActive: data.isActive ?? true,
      tokenVersion: data.tokenVersion || '0',
      lastPasswordChange: data.lastPasswordChange || new Date().toISOString()
    };

    console.log('AuthService - getCurrentUser - Final user data:', processedUser);
    return processedUser;
  },

  refreshToken: (): Promise<{ accessToken: string }> => {
    return new Promise((resolve, reject) => {
      api.post<{ accessToken: string }>('/auth/refresh-token', {}, { withCredentials: true })
        .then(response => {
          if (response.data?.accessToken) {
            resolve(response.data);
          } else {
            throw new Error('No access token in response');
          }
        })
        .catch(error => {
          if (typeof window !== 'undefined') {
            // Clear cookies
            document.cookie = 'accessToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            document.cookie = 'refreshToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            if (window.location.pathname !== '/auth/login') {
              window.location.href = '/auth/login';
            }
          }
          reject(error);
        });
    });
  },
};

export default authService;
