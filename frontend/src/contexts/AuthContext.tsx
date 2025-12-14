'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  useCallback,
  useRef,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getCookie, deleteCookie, setCookie } from 'cookies-next';
import { toast } from 'sonner';
import { authService, isTokenExpired } from '@/services/auth.service';
import { UserRole, type User } from '@/types/user.types';
import { isBrowser, safeLocalStorage, safeSessionStorage } from '@/lib/browser';

export type LoginResponse = {
  success: boolean;
  user?: User;
  error?: string;
};

export type AuthContextType = {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<LoginResponse>;
  register: (userData: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    companyName?: string;
    zoneId?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (requiredRole: UserRole | UserRole[]) => boolean;
  clearError: () => void;
};

// Manual cookie helpers as fallback
const manualGetCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift();
    return cookieValue || null;
  }
  return null;
};

// Development localStorage token helper with expiration check
const getDevToken = (): string | null => {
  if (process.env.NODE_ENV !== 'development') return null;
  
  const token = localStorage.getItem('dev_accessToken');
  const expiry = localStorage.getItem('dev_tokenExpiry');
  
  if (!token || !expiry) return null;
  
  const expiryTime = parseInt(expiry);
  const now = Date.now();
  
  if (now > expiryTime) {
    localStorage.removeItem('dev_accessToken');
    localStorage.removeItem('dev_userRole');
    localStorage.removeItem('dev_rememberMe');
    localStorage.removeItem('dev_tokenExpiry');
    return null;
  }
  
  return token;
};

const manualSetCookie = (name: string, value: string, options: any = {}) => {
  if (typeof document === 'undefined') return;
  
  // Try multiple cookie setting approaches for maximum compatibility
  const approaches = [
    // Approach 1: Simple cookie with minimal options
    () => {
      document.cookie = `${name}=${value}; path=/`;
    },
    
    // Approach 2: Cookie with expiration
    () => {
      const expires = new Date(Date.now() + (options.maxAge || 86400) * 1000);
      document.cookie = `${name}=${value}; path=/; expires=${expires.toUTCString()}`;
    },
    
    // Approach 3: Full options (original)
    () => {
      let cookieString = `${name}=${value}`;
      if (options.path) cookieString += `; path=${options.path}`;
      if (options.expires) cookieString += `; expires=${options.expires.toUTCString()}`;
      if (options.maxAge) cookieString += `; max-age=${options.maxAge}`;
      if (!options.secure) cookieString += ``; // Skip secure in development
      if (options.sameSite) cookieString += `; samesite=${options.sameSite}`;
      document.cookie = cookieString;
    }
  ];
  
  // Try each approach and check if cookies are set
  for (let i = 0; i < approaches.length; i++) {
    try {
      approaches[i]();
      // Check if cookie was set
      setTimeout(() => {
        if (document.cookie.includes(`${name}=`)) {
          return;
        } else if (i === approaches.length - 1) {
          // Try localStorage as absolute fallback
          localStorage.setItem(`cookie_${name}`, value);
          }
      }, 10);
    } catch (error) {
      // Silently fail
    }
  }
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const router = useRouter();
  const pathname = usePathname();

  const coerceOptionalNumber = (value: unknown): number | null | undefined => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const parsed = typeof value === 'string' ? Number(value) : (value as number);
    return Number.isNaN(parsed as number) ? undefined : (parsed as number);
  };

  const getRoleBasedRedirect = (role: UserRole): string => {
    switch (role) {
      case UserRole.ADMIN:
        return '/admin/dashboard';
      case UserRole.ZONE_USER:
        return '/zone/dashboard';
      case UserRole.SERVICE_PERSON:
        return '/service-person/dashboard';
      default:
        return '/auth/login';
    }
  };

  const loadUser = useCallback(async (currentPath?: string): Promise<User | null> => {
    const pathToCheck = currentPath || pathname;
    if (pathToCheck.startsWith('/auth/')) {
      return null;
    }
    try {
      const token = getCookie('accessToken') || getCookie('token') || 
                   manualGetCookie('accessToken') || manualGetCookie('token') ||
                   localStorage.getItem('cookie_accessToken') ||
                   getDevToken();
      if (!token) {
        return null;
      }

      const userData = await authService.getCurrentUser();
      if (!userData || !userData.email) {
        return null;
      }

      // Ensure consistent name handling with better validation
      let userName = userData.name?.trim();
      
      // Check if name is valid and not a placeholder
      if (!userName || userName === '' || userName === 'null' || userName === 'undefined' || userName === 'User') {
        userName = userData.email?.split('@')[0] || 'User';
      }
      
      const safeUser: User = {
        ...userData,
        name: userName,
        isActive: userData.isActive ?? true,
        tokenVersion: userData.tokenVersion || '0',
        lastPasswordChange: userData.lastPasswordChange || new Date().toISOString(),
        zoneId: coerceOptionalNumber((userData as any).zoneId),
        customerId: coerceOptionalNumber((userData as any).customerId),
      };

      // Update state immediately to prevent race conditions
      setUser(safeUser);
      setAccessToken(token as string);

      // Store user role in cookie for persistence
      setCookie('userRole', safeUser.role, {
        path: '/',
        secure: process.env.NODE_ENV === 'production' ? true : false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      // Role-based access is now handled by server-side layout and middleware
      // Removed client-side enforceRoleAccess to prevent render-time redirects

      return safeUser;
    } catch (err) {
      // Don't clear user state here, let the caller handle it
      throw err;
    }
  }, [pathname]);

  const authCheckInProgress = useRef(false);
  const initialAuthCheck = useRef(false);
  const lastValidUser = useRef<User | null>(null);
  const isInitializing = useRef(true);
  const lastAuthCheckTime = useRef(0);
  const authCheckTimeoutRef = useRef<NodeJS.Timeout>();

  // Network status detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize user from cookies on mount to prevent flash
  useEffect(() => {
    const initializeAuth = () => {
      if (!isBrowser) {
        isInitializing.current = false;
        return;
      }
      
      // Try multiple cookie retrieval methods including localStorage fallback
      const token = getCookie('accessToken') || getCookie('token') || 
                   manualGetCookie('accessToken') || manualGetCookie('token') ||
                   localStorage.getItem('cookie_accessToken') ||
                   getDevToken();
      const role = (getCookie('userRole') || manualGetCookie('userRole') || 
                   localStorage.getItem('cookie_userRole') ||
                   (process.env.NODE_ENV === 'development' ? localStorage.getItem('dev_userRole') : null)) as UserRole | undefined;
      
      // Debug all cookies
      if (typeof document !== 'undefined') {
        // Cookies available
      }
      
      // If we have both token and role, try to restore user state immediately
      if (token && role) {
        // Try to get cached user from session storage first
        const cachedUser = safeSessionStorage.getItem('currentUser');
        if (cachedUser) {
          try {
            const parsedUser = JSON.parse(cachedUser);
            if (parsedUser && parsedUser.email && parsedUser.role === role) {
              setUser(parsedUser);
              setAccessToken(token as string);
              lastValidUser.current = parsedUser;
              // Set loading to false immediately since we have cached data
              setIsLoading(false);
              isInitializing.current = false;
              return;
            }
          } catch (e) {
            // Parse error
          }
        }
        
        // If no cached user but we have token and role, create a minimal user object
        // This prevents the flash of "User" before the real data loads
        setAccessToken(token as string);
      }
      
      isInitializing.current = false;
    };
    
    initializeAuth();
  }, []); // Run only once on mount

  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth checks when offline
      if (!isOnline) {
        setIsLoading(false);
        return;
      }
      
      // Add debouncing to prevent rapid auth checks
      const now = Date.now();
      if (now - lastAuthCheckTime.current < 2000) { // 2 second debounce
        return;
      }
      lastAuthCheckTime.current = now;
      
      // Wait for initialization to complete
      if (isInitializing.current) {
        return;
      }
      
      // Prevent multiple simultaneous auth checks
      if (authCheckInProgress.current) {
        return;
      }
      
      try {
        authCheckInProgress.current = true;
        
        // If user is already authenticated and we've done initial check, don't re-check
        if (user && user.email && user.role && initialAuthCheck.current && !pathname.startsWith('/auth/')) {
          setIsLoading(false);
          return;
        }
        
        // Don't show loading on auth pages to prevent flicker
        if (!pathname.startsWith('/auth/') && !user) {
          setIsLoading(true);
        }
        
        // Quick check for basic auth tokens first including localStorage fallback
        const token = getCookie('accessToken') || getCookie('token') || 
                     manualGetCookie('accessToken') || manualGetCookie('token') ||
                     localStorage.getItem('cookie_accessToken') ||
                     getDevToken();
        const role = (getCookie('userRole') || manualGetCookie('userRole') || 
                     localStorage.getItem('cookie_userRole') ||
                     (process.env.NODE_ENV === 'development' ? localStorage.getItem('dev_userRole') : null)) as UserRole | undefined;
        
        // Debug all cookies
        if (typeof document !== 'undefined') {
          // Cookies available
        }
        
        // If no token at all, clear state only if we currently have a user
        if (!token) {
          if (user || accessToken) {
            await clearAuthState();
          }
          setIsLoading(false);
          initialAuthCheck.current = true;
          return;
        }
        
        // If we already have a valid user with the same role as the cookie, don't re-fetch
        // This prevents unnecessary API calls and reduces the chance of token conflicts
        if (user && user.email && user.role === role && token && !pathname.startsWith('/auth/')) {
          setAccessToken(token as string);
          setIsLoading(false);
          initialAuthCheck.current = true;
          return;
        }
        
        // If we have a token, try to load/validate user data
        try {
          const userData = await loadUser(pathname);
          if (userData) {
            setAccessToken(token as string);
            lastValidUser.current = userData;
            // Cache user in session storage for faster restoration
            safeSessionStorage.setItem('currentUser', JSON.stringify(userData));
            initialAuthCheck.current = true;
            return;
          } else {
            // Don't immediately clear state, try to use last valid user or cached user
            if (lastValidUser.current && token && role) {
              setUser(lastValidUser.current);
              setAccessToken(token as string);
              return;
            }
            
            // Try cached user from session storage
            const cachedUser = safeSessionStorage.getItem('currentUser');
            if (cachedUser && token && role) {
              try {
                const parsedUser = JSON.parse(cachedUser);
                if (parsedUser && parsedUser.email && parsedUser.role === role) {
                  setUser(parsedUser);
                  setAccessToken(token as string);
                  lastValidUser.current = parsedUser;
                  return;
                }
              } catch (e) {
                }
            }
            
            await clearAuthState();
          }
        } catch (err) {
          // Handle errors more gracefully for concurrent sessions
          if (err && typeof err === 'object' && 'response' in err) {
            const response = (err as any).response;
            // Only clear auth state for definitive authentication failures
            // Don't clear for network errors or temporary server issues
            if (response?.status === 401 && response?.data?.code === 'TOKEN_MISMATCH') {
              await clearAuthState();
            } else if (response?.status === 403) {
              await clearAuthState();
            } else {
              // For network errors, try to use cached user
              if (lastValidUser.current && token && role) {
                setUser(lastValidUser.current);
                setAccessToken(token as string);
                return;
              }
              
              // Try cached user from session storage
              const cachedUser = safeSessionStorage.getItem('currentUser');
              if (cachedUser && token && role) {
                try {
                  const parsedUser = JSON.parse(cachedUser);
                  if (parsedUser && parsedUser.email && parsedUser.role === role) {
                    setUser(parsedUser);
                    setAccessToken(token as string);
                    lastValidUser.current = parsedUser;
                    return;
                  }
                } catch (e) {
                  // Parse error
                }
              }
            }
          } else {
            // For other errors, try to use cached user
            if (lastValidUser.current && token && role) {
              setUser(lastValidUser.current);
              setAccessToken(token as string);
              return;
            }
            
            // Try cached user from session storage
            const cachedUser = safeSessionStorage.getItem('currentUser');
            if (cachedUser && token && role) {
              try {
                const parsedUser = JSON.parse(cachedUser);
                if (parsedUser && parsedUser.email && parsedUser.role === role) {
                  setUser(parsedUser);
                  setAccessToken(token as string);
                  lastValidUser.current = parsedUser;
                  return;
                }
              } catch (e) {
                }
            }
          }
        }
        
        initialAuthCheck.current = true;
      } catch (error) {
        // Try to preserve user state on errors
        const token = getCookie('accessToken');
        if (lastValidUser.current && token) {
          setUser(lastValidUser.current);
          setAccessToken(token as string);
        } else {
          // Try cached user from session storage
          const cachedUser = safeSessionStorage.getItem('currentUser');
          const role = getCookie('userRole') as UserRole | undefined;
          if (cachedUser && token && role) {
            try {
              const parsedUser = JSON.parse(cachedUser);
              if (parsedUser && parsedUser.email && parsedUser.role === role) {
                setUser(parsedUser);
                setAccessToken(token as string);
                lastValidUser.current = parsedUser;
                return;
              }
            } catch (e) {
              // Parse error
            }
          }
          
          if (!user) {
            await clearAuthState();
          }
        }
        initialAuthCheck.current = true;
      } finally {
        setIsLoading(false);
        authCheckInProgress.current = false;
      }
    };
    
    let timeoutIds: NodeJS.Timeout[] = [];
    
    // Only run auth check in browser and if we're not on auth pages
    if (isBrowser && !pathname.startsWith('/auth/')) {
      // Wait for initialization to complete before running auth check
      if (isInitializing.current) {
        const initWaitTimeout = setTimeout(() => {
          if (!isInitializing.current) {
            checkAuth();
          }
        }, 50);
        timeoutIds.push(initWaitTimeout);
      } else {
        // Add a small delay to prevent race conditions on page refresh
        const checkAuthTimeout = setTimeout(checkAuth, 50);
        timeoutIds.push(checkAuthTimeout);
        
        // Add a safety timeout to ensure loading doesn't get stuck
        const safetyTimeout = setTimeout(() => {
          setIsLoading(false);
          initialAuthCheck.current = true;
        }, 3000); // 3 second safety timeout
        timeoutIds.push(safetyTimeout);
      }
    } else {
      // For auth pages, set loading to false after render to avoid hooks error
      const authPageTimeout = setTimeout(() => {
        setIsLoading(false);
        initialAuthCheck.current = true;
      }, 0);
      timeoutIds.push(authPageTimeout);
    }
    
    // Cleanup function
    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
      if (authCheckTimeoutRef.current) {
        clearTimeout(authCheckTimeoutRef.current);
      }
      authCheckInProgress.current = false;
    };
  }, [pathname, isOnline]); // Add isOnline dependency

  const clearAuthState = async () => {
    setUser(null);
    setAccessToken(null);
    setError(null);
    lastValidUser.current = null;
    
    // Clear cookies
    deleteCookie('accessToken');
    deleteCookie('refreshToken');
    deleteCookie('userRole');
    
    // Clear storage including localStorage fallbacks
    safeLocalStorage.removeItem('auth_token');
    safeLocalStorage.removeItem('refresh_token');
    safeLocalStorage.removeItem('cookie_accessToken');
    safeLocalStorage.removeItem('cookie_refreshToken');
    safeLocalStorage.removeItem('cookie_userRole');
    safeSessionStorage.removeItem('currentUser');
    
    // Clear development localStorage items
    if (process.env.NODE_ENV === 'development') {
      safeLocalStorage.removeItem('dev_accessToken');
      safeLocalStorage.removeItem('dev_userRole');
      safeLocalStorage.removeItem('dev_rememberMe');
      safeLocalStorage.removeItem('dev_tokenExpiry');
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login({ email, password });
      if (!response || !response.user || !response.accessToken) {
        throw new Error('Invalid login response from server');
      }

      // Ensure consistent name handling with better validation
      let userName = response.user.name?.trim();
      
      // Check if name is valid and not a placeholder
      if (!userName || userName === '' || userName === 'null' || userName === 'undefined' || userName === 'User') {
        userName = response.user.email?.split('@')[0] || email.split('@')[0] || 'User';
      }
      
      const safeUser: User = {
        id: response.user.id,
        email: response.user.email || email,
        name: userName,
        role: response.user.role || 'customer',
        isActive: response.user.isActive ?? true,
        tokenVersion: response.user.tokenVersion || '0',
        lastPasswordChange: response.user.lastPasswordChange || new Date().toISOString(),
        ...(response.user.phone && { phone: response.user.phone }),
        ...(response.user.companyName && { companyName: response.user.companyName }),
        ...(response.user.zoneId !== undefined && { zoneId: coerceOptionalNumber((response.user as any).zoneId) }),
        ...(response.user.customerId !== undefined && { customerId: coerceOptionalNumber((response.user as any).customerId) }),
      };

      const cookieOptions = {
        path: '/',
        secure: process.env.NODE_ENV === 'production' ? true : false,
        sameSite: 'lax' as const,
        httpOnly: false, // Must be false for client-side access
      };

      // Set cookies with different expiration times based on rememberMe
      const tokenMaxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24; // 30 days if remember me, 24 hours otherwise
      const roleMaxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7; // 30 days if remember me, 7 days otherwise
      
      const tokenOptions = { 
        ...cookieOptions, 
        maxAge: tokenMaxAge,
        expires: new Date(Date.now() + tokenMaxAge * 1000)
      };
      
      const roleOptions = { 
        ...cookieOptions, 
        maxAge: roleMaxAge,
        expires: new Date(Date.now() + roleMaxAge * 1000)
      };

      // Set cookies using cookies-next
      setCookie('accessToken', response.accessToken, tokenOptions);
      setCookie('userRole', safeUser.role, roleOptions);
      
      if (response.refreshToken) {
        setCookie('refreshToken', response.refreshToken, roleOptions);
      }

      // Also set cookies manually as fallback
      manualSetCookie('accessToken', response.accessToken, tokenOptions);
      manualSetCookie('userRole', safeUser.role, roleOptions);
      
      if (response.refreshToken) {
        manualSetCookie('refreshToken', response.refreshToken, roleOptions);
      }

      // Verify cookies were set immediately
      // Store token in localStorage as primary storage for development reliability
      if (process.env.NODE_ENV === 'development') {
        localStorage.setItem('dev_accessToken', response.accessToken);
        localStorage.setItem('dev_userRole', safeUser.role);
        localStorage.setItem('dev_rememberMe', rememberMe.toString());
        localStorage.setItem('dev_tokenExpiry', (Date.now() + tokenMaxAge * 1000).toString());
      }
      
      setTimeout(() => {
        const verifyToken = getCookie('accessToken') || manualGetCookie('accessToken') || 
                           getDevToken();
        const verifyRole = getCookie('userRole') || manualGetCookie('userRole') || 
                          (process.env.NODE_ENV === 'development' ? localStorage.getItem('dev_userRole') : null);
        if (!verifyToken) {
          // Try to set cookies again with a simpler method
          document.cookie = `accessToken=${response.accessToken}; path=/; max-age=${tokenMaxAge}`;
          document.cookie = `userRole=${safeUser.role}; path=/; max-age=${roleMaxAge}`;
        }
      }, 100);

      // Update state immediately to prevent race conditions
      setAccessToken(response.accessToken);
      setUser(safeUser);
      lastValidUser.current = safeUser;
      // Cache user in session storage for faster restoration
      safeSessionStorage.setItem('currentUser', JSON.stringify(safeUser));
      // Show success toast
      toast.success(`Welcome back, ${safeUser.name}!`, {
        description: `You are logged in as ${safeUser.role.toLowerCase().replace('_', ' ')}`,
        duration: 3000,
      });

      // Redirect immediately without delay to prevent race conditions
      const redirectPath = getRoleBasedRedirect(safeUser.role);
      router.replace(redirectPath);

      return { success: true, user: safeUser };
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Login failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      // Logout error
    } finally {
      // Clear all auth-related cookies with all possible options to ensure they're removed (but preserve PIN session)
      const clearAllCookies = () => {
        const cookies = document.cookie.split(';');
        const domain = window.location.hostname;
        
        // Clear cookies with domain (but skip PIN session)
        cookies.forEach(cookie => {
          const [name] = cookie.split('=').map(c => c.trim());
          if (name && name !== 'pinSession') {
            document.cookie = `${name}=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
            document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          }
        });
      };

      try {
        // Clear cookies using deleteCookie with all possible options
        const domains = [
          window.location.hostname,
          `.${window.location.hostname}`,
          window.location.hostname.split('.').slice(-2).join('.'),
          `.${window.location.hostname.split('.').slice(-2).join('.')}`
        ];

        // Ensure we clear all variations of the cookies (but preserve PIN session)
        ['accessToken', 'refreshToken', 'token', 'userRole', 'auth_token', 'refresh_token'].forEach(cookieName => {
          // Clear with all possible domain variations
          domains.forEach(domain => {
            document.cookie = `${cookieName}=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          });
          // Clear without domain
          document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          // Also clear with max-age=0
          document.cookie = `${cookieName}=; path=/; max-age=0`;
        });

        // Also try the deleteCookie function
        const cookieOptions = {
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax' as const,
        };

        ['accessToken', 'refreshToken', 'token', 'userRole', 'auth_token', 'refresh_token'].forEach(cookieName => {
          deleteCookie(cookieName, cookieOptions);
        });

        // Clear all cookies as a last resort
        clearAllCookies();
        
        // Final explicit clear for userRole
        document.cookie = 'userRole=; path=/; max-age=0';
        document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      } catch (e) {
        // Cookie clear error
      }

      // Clear local storage and session storage (but preserve PIN session)
      if (typeof window !== 'undefined') {
        // Preserve important data before clearing
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        const rememberedPassword = localStorage.getItem('rememberedPassword');
        const wasRemembered = localStorage.getItem('wasRemembered');
        const pinAccessSession = localStorage.getItem('pinAccessSession');
        const pinLockoutInfo = localStorage.getItem('pinLockoutInfo');
        
        // Clear all storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Restore "Remember Me" credentials if they existed
        if (rememberedEmail && rememberedPassword && wasRemembered === 'true') {
          localStorage.setItem('rememberedEmail', rememberedEmail);
          localStorage.setItem('rememberedPassword', rememberedPassword);
          localStorage.setItem('wasRemembered', wasRemembered);
        }
        
        // Restore PIN session data for convenience
        if (pinAccessSession) {
          localStorage.setItem('pinAccessSession', pinAccessSession);
        }
        
        if (pinLockoutInfo) {
          localStorage.setItem('pinLockoutInfo', pinLockoutInfo);
        }
      }

      // Reset state
      setUser(null);
      setAccessToken(null);
      setError(null);

      // Redirect to login (PIN session remains active for convenience)
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
  };

  const register = async (userData: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    companyName?: string;
    zoneId?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const { user, accessToken, refreshToken } = await authService.register(userData);

      const cookieOptions = {
        path: '/',
        secure: process.env.NODE_ENV === 'production' ? true : false,
        sameSite: 'lax' as const,
      };

      setCookie('accessToken', accessToken, cookieOptions);
      setCookie('refreshToken', refreshToken, cookieOptions);

      const registeredUser: User = {
        ...user,
        zoneId: coerceOptionalNumber((user as any).zoneId),
        customerId: coerceOptionalNumber((user as any).customerId),
        tokenVersion: user.tokenVersion || '0',
        name: user.name || user.email?.split('@')[0] || 'User',
      };

      setUser(registeredUser);

      toast.success('Account created successfully!', {
        description: `Welcome to the platform, ${user.name || user.email || 'User'}!`,
      });

      router.replace(getRoleBasedRedirect(user.role));
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (requiredRole: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    return Array.isArray(requiredRole) ? requiredRole.includes(user.role) : user.role === requiredRole;
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        logout,
        hasPermission,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export default AuthProvider;
