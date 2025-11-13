'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Shield, AlertCircle, CheckCircle, Key, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { apiClient } from '@/lib/api/api-client';

// Type definitions for session data
interface PinSession {
  sessionId: string;
  expiresAt: string;
}

// Custom type for this specific API response
interface PinValidationResponse {
  success: boolean;
  message?: string;
  error?: string;
  sessionId?: string;
  expiresAt?: string;
  attemptsLeft?: number;
  lockedUntil?: string;
  code?: string;
}

// Helper to get/set session from localStorage
const LOCAL_STORAGE_KEY = 'pinAccessSession';
const LOCKOUT_STORAGE_KEY = 'pinLockoutInfo';

const getLocalSession = (): PinSession | null => {
  try {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (data) {
        const session = JSON.parse(data) as PinSession;
        // Check if session is expired
        if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
          return session;
        }
        // Remove expired session
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }
  } catch (error) {
    console.error('Error reading PIN session from localStorage:', error);
  }
  return null;
};

const setLocalSession = (session: PinSession): boolean => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(session));
      return true;
    }
  } catch (error) {
    console.error('Error saving PIN session to localStorage:', error);
  }
  return false;
};

// Helper functions for lockout persistence
interface LockoutInfo {
  isLocked: boolean;
  lockedUntil: string;
  timestamp: number;
}

const getLockoutInfo = (): LockoutInfo | null => {
  try {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(LOCKOUT_STORAGE_KEY);
      if (data) {
        const lockoutInfo = JSON.parse(data) as LockoutInfo;
        // Check if lockout has expired
        if (lockoutInfo.lockedUntil && new Date(lockoutInfo.lockedUntil) > new Date()) {
          return lockoutInfo;
        }
        // Remove expired lockout
        localStorage.removeItem(LOCKOUT_STORAGE_KEY);
      }
    }
  } catch (error) {
    // Handle error silently in production
  }
  return null;
};

const setLockoutInfo = (lockoutInfo: LockoutInfo): void => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify(lockoutInfo));
    }
  } catch (error) {
    // Handle error silently in production
  }
};

const clearLockoutInfo = (): void => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCKOUT_STORAGE_KEY);
    }
  } catch (error) {
    // Handle error silently in production
  }
};

export default function PinAccessPage() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(true);
  // Enhanced visual states
  const [animatePulse, setAnimatePulse] = useState(false);
  // Attempt tracking
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<string | null>(null);
  const [lockoutCountdown, setLockoutCountdown] = useState<string>('');
  const router = useRouter();
  
  // React ref for input focus
  const pinInputRef = useRef<HTMLInputElement>(null);
  
  
  // Pre-generate animation values to prevent layout shifts
  const floatingParticles = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      width: Math.random() * 12 + 4,
      height: Math.random() * 12 + 4,
      top: Math.random() * 100,
      left: Math.random() * 100,
      animationDelay: Math.random() * 5,
      animationDuration: Math.random() * 10 + 15
    })), []
  );

  // Check lockout status and fetch attempt count on page load
  useEffect(() => {
    const initializePinStatus = async () => {
      try {
        // First, check localStorage for lockout info
        const localLockout = getLockoutInfo();
        
        if (localLockout) {
          setIsLocked(true);
          setLockoutTime(localLockout.lockedUntil);
          // Still check backend but don't override local lockout
        }

        // Always check with backend for latest status
        const response = await apiClient.get('/auth/pin-status');
        if (response.data) {
          setAttemptsLeft(response.data.attemptsLeft || 5);
          
          // Check if backend says we're locked (but don't override existing local lockout)
          if (response.data.lockedUntil && !localLockout) {
            const lockoutTime = response.data.lockedUntil;
            setIsLocked(true);
            setLockoutTime(lockoutTime);
            
            // Store lockout info locally
            setLockoutInfo({
              isLocked: true,
              lockedUntil: lockoutTime,
              timestamp: Date.now()
            });
          } else if (!response.data.lockedUntil && !localLockout) {
            // Clear any stale lockout info only if backend confirms no lockout
            clearLockoutInfo();
            setIsLocked(false);
            setLockoutTime(null);
          }
        }
      } catch (error) {
        // Handle API error silently
        // If we have local lockout info, keep it even if API fails
        const localLockout = getLockoutInfo();
        if (localLockout) {
          setIsLocked(true);
          setLockoutTime(localLockout.lockedUntil);
        }
      }
    };

    initializePinStatus();
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isLocked && lockoutTime) {
      interval = setInterval(() => {
        const now = new Date();
        const lockoutEnd = new Date(lockoutTime);
        const timeLeft = lockoutEnd.getTime() - now.getTime();
        
        if (timeLeft <= 0) {
          // Lockout has expired
          setIsLocked(false);
          setLockoutTime(null);
          setLockoutCountdown('');
          clearLockoutInfo();
        } else {
          // Calculate remaining time
          const minutes = Math.floor(timeLeft / (1000 * 60));
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
          setLockoutCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isLocked, lockoutTime]);

  // Check if user already has valid PIN session on page load
  useEffect(() => {
    const checkPinSession = async () => {
      // Don't check PIN session if we're locked out
      if (isLocked) {
        setChecking(false);
        return;
      }
      
      try {
        // Check if PIN session cookie exists
        let hasValidSession = false;
        
        // Check cookie first
        try {
          const allCookies = document.cookie.split('; ');
          const pinSession = allCookies.find(row => row.startsWith('pinSession='));
          
          if (pinSession) {
            hasValidSession = true;
          }
        } catch (cookieError) {
          // Handle error silently in development
          if (process.env.NODE_ENV === 'development') {
            console.warn('Error checking cookies:', cookieError);
          }
        }
        
        // If no cookie, check localStorage fallback
        if (!hasValidSession) {
          const localSession = getLocalSession();
          if (localSession && localSession.sessionId) {
            hasValidSession = true;
          }
        }
        
        if (hasValidSession) {
          // Valid session found, redirect silently
          router.push('/auth/login');
          return;
        }
        
        // No valid session found, continue to show PIN entry
        setChecking(false);
      } catch (error) {
        // If there's any error, just show the PIN entry form
        // Handle error silently
        setChecking(false);
      }
    };

    checkPinSession();
  }, [router, isLocked]);


  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent default form submission behavior
    e.preventDefault();
    e.stopPropagation();
    
    // Don't proceed if already loading or successful
    if (loading || success) {
      return false;
    }
    
    setLoading(true);
    setError('');

    try {
      
      // This specific API endpoint returns a custom format
      // Skip global error handler to prevent automatic redirects on PIN validation failure
      const apiResponse = await apiClient.post<PinValidationResponse>('/auth/validate-pin', { pin }, {
        headers: {
          'X-Skip-Global-Error-Handler': 'true'
        }
      });

      // The API client wraps responses, but PIN endpoint returns direct response
      // Handle both wrapped and direct response formats
      const response = (apiResponse.data || apiResponse) as PinValidationResponse;

      // Check if response is successful
      if (response && response.success === true) {
        setSuccess(true);
        // Trigger success animation
        setAnimatePulse(true);
        
        // Clear any lockout info on successful login
        clearLockoutInfo();
        setIsLocked(false);
        setLockoutTime(null);
        
        // Store session in localStorage as fallback
        const { sessionId, expiresAt } = response;
        if (sessionId && expiresAt) {
          setLocalSession({
            sessionId,
            expiresAt // Backend controls expiration (30 days)
          });
        }
        
        // Wait a bit to ensure everything is processed, then redirect
        setTimeout(() => {
          // Try to detect if cookies are working
          let cookieWorking = false;
          try {
            const allCookies = document.cookie.split('; ');
            const pinSession = allCookies.find(c => c.startsWith('pinSession='));
            
            if (pinSession) {
              cookieWorking = true;
            }
          } catch (cookieError) {
            console.error('Error checking cookies:', cookieError);
          }
          
          // Add session ID to API client for future requests if cookies aren't working
          if (!cookieWorking && response.sessionId) {
            apiClient.setPinSession(response.sessionId);
          }
          
          router.push('/auth/login');
        }, 2000);
        
        return false;
      } else {
        setError(response?.error || response?.message || 'Invalid PIN');
        
        // Update attempt count if provided
        if (typeof response?.attemptsLeft === 'number') {
          setAttemptsLeft(response.attemptsLeft);
        }
        
        setPin(''); // Clear PIN on error so user can try again easily
        setLoading(false);
        return false;
      }
    } catch (error: any) {
      
      let errorMessage = '';
      
      // Handle axios error response
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid PIN. Please try again.';
      } else if (error.response?.status === 429) {
        errorMessage = error.response.data?.error || 'Too many attempts. Please wait before trying again.';
      } else if (error.response?.status) {
        errorMessage = `Server error (${error.response.status}). Please check the server connection.`;
      } else if (error.message) {
        errorMessage = `Network error: ${error.message}`;
      } else {
        errorMessage = 'Connection error. Please check your network and try again.';
      }
      
      // Update attempt count if provided in error response
      if (error.response?.data?.attemptsLeft !== undefined) {
        setAttemptsLeft(error.response.data.attemptsLeft);
      }
      
      // Handle lockout status
      if (error.response?.data?.lockedUntil) {
        const lockoutTime = error.response.data.lockedUntil;
        setIsLocked(true);
        setLockoutTime(lockoutTime);
        
        // Store lockout info in localStorage
        setLockoutInfo({
          isLocked: true,
          lockedUntil: lockoutTime,
          timestamp: Date.now()
        });
      }
      
      setError(errorMessage);
      setPin(''); // Clear PIN on error so user can try again easily
      setLoading(false);
      return false;
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    if (value.length <= 6) {
      setPin(value);
      setError(''); // Clear error when user types
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow backspace to clear PIN
    if (e.key === 'Backspace' && pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError('');
    }
    // Submit on Enter if PIN is complete
    if (e.key === 'Enter' && pin.length === 6 && !loading && !success) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  // Show loading screen while checking PIN status
  if (checking) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#507295] via-[#5a7ba0] to-[#4a6b8a]"></div>
        
        <div className="w-full max-w-md relative z-10">
          <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-sm bg-white/95">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <Image
                  src="/kardex.png"
                  alt="Kardex Logo"
                  width={200}
                  height={80}
                  className="mx-auto drop-shadow-sm"
                  priority
                />
              </div>
              <div className="mb-6">
                <div className="relative w-16 h-16 mx-auto">
                  <Loader2 className="h-16 w-16 text-[#507295] animate-spin" />
                  <div className="absolute inset-0 border-4 border-[#aac01d]/20 rounded-full animate-pulse"></div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Checking Access...
              </h3>
              <p className="text-gray-600 text-sm">
                Verifying your session status...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#507295] via-[#5a7ba0] to-[#4a6b8a] overflow-hidden">
        {/* Dynamic particle effect */}
        <div className="absolute top-0 left-0 w-full h-full">
          {floatingParticles.map((particle) => (
            <div 
              key={particle.id}
              className="absolute rounded-full bg-white/10 animate-float"
              style={{
                width: `${particle.width}px`,
                height: `${particle.height}px`,
                top: `${particle.top}%`,
                left: `${particle.left}%`,
                animationDelay: `${particle.animationDelay}s`,
                animationDuration: `${particle.animationDuration}s`
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Animated Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#aac01d]/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-[#507295]/30 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-[#aac01d]/10 to-[#507295]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>
      
      {/* Geometric Pattern Overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 2px, transparent 2px),
            radial-gradient(circle at 75% 75%, rgba(172,192,29,0.1) 1px, transparent 1px),
            linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.05) 50%, transparent 60%)
          `,
          backgroundSize: '60px 60px, 40px 40px, 120px 120px',
          backgroundPosition: '0 0, 30px 30px, 0 0'
        }}></div>
      </div>
      
      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}></div>
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-[#aac01d]/30 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
        <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-white/15 rounded-full animate-bounce" style={{ animationDelay: '2s', animationDuration: '5s' }}></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-[#aac01d]/20 rounded-full animate-bounce" style={{ animationDelay: '3s', animationDuration: '3.5s' }}></div>
      </div>
      
      {/* Glass Morphism Background Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/5 backdrop-blur-[0.5px]"></div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Main PIN Card */}
        <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-sm bg-white/95">
          {/* Header Section */}
          <CardHeader className="text-center bg-gradient-to-b from-white to-gray-50/50 p-8 pb-6">
            <div className="mb-6">
              <Image
                src="/kardex.png"
                alt="Kardex Logo"
                width={200}
                height={80}
                className="mx-auto drop-shadow-sm"
                priority
              />
            </div>
            <CardTitle className="text-2xl font-bold text-[#507295] mb-2">
              Secure Access
            </CardTitle>
            <CardDescription className="text-gray-600">
              Enter your security code to continue
            </CardDescription>
          </CardHeader>

          {/* Form Section */}
          <CardContent className="p-8 relative">
            {/* Success Overlay */}
            {success && (
              <div className="absolute inset-0 bg-white/98 backdrop-blur-md flex items-center justify-center z-20 rounded-3xl">
                <div className="text-center p-8">
                  <div className="mb-6">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-12 w-12 text-green-600 animate-bounce" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Access Granted!</h3>
                  <p className="text-gray-600 mb-6">Redirecting to login page...</p>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Loading Overlay */}
            {loading && !success && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex items-center justify-center z-10 rounded-3xl">
                <div className="text-center p-8">
                  <div className="mb-6">
                    <div className="relative w-16 h-16 mx-auto">
                      <Loader2 className="h-16 w-16 text-[#507295] animate-spin" />
                      <div className="absolute inset-0 border-4 border-[#aac01d]/20 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    Verifying Access...
                  </h3>
                  <p className="text-gray-600 text-sm mb-6">
                    Checking your security code...
                  </p>
                  <div className="w-64 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#507295] via-[#aac01d] to-[#507295] rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* PIN Input Field */}
              <div className="space-y-6">
                <label htmlFor="pin-input" className="text-sm font-medium text-gray-700 block text-center">Security Code</label>
                
                {/* Individual PIN Boxes */}
                <div className="flex justify-center gap-3">
                  {Array.from({ length: 6 }, (_, index) => (
                    <div
                      key={index}
                      className={`
                        w-16 h-20 rounded-3xl border-3 flex items-center justify-center text-4xl font-black
                        transition-all duration-300 ease-out relative overflow-hidden
                        ${isLocked 
                          ? 'border-red-300 bg-gradient-to-br from-red-50 to-red-100 cursor-not-allowed opacity-60'
                          : pin.length > index
                          ? 'border-[#507295] bg-gradient-to-br from-[#507295]/25 to-[#507295]/15 text-[#507295] shadow-xl scale-110 ring-4 ring-[#507295]/20 cursor-pointer'
                          : pin.length === index
                          ? 'border-[#aac01d] bg-gradient-to-br from-[#aac01d]/25 to-[#aac01d]/15 shadow-lg ring-4 ring-[#aac01d]/30 animate-pulse cursor-pointer'
                          : 'border-gray-300 bg-gradient-to-br from-white to-gray-50 hover:border-[#aac01d]/50 hover:shadow-md hover:scale-105 cursor-pointer'
                        }
                      `}
                      onClick={() => {
                        if (pinInputRef.current && !loading && !success && !isLocked) {
                          pinInputRef.current.focus();
                        }
                      }}
                    >
                      {/* Background glow effect */}
                      <div className={`absolute inset-0 rounded-3xl ${
                        pin.length > index 
                          ? 'bg-gradient-to-br from-[#507295]/10 to-transparent' 
                          : pin.length === index
                          ? 'bg-gradient-to-br from-[#aac01d]/10 to-transparent'
                          : ''
                      }`}></div>
                      
                      {/* Content */}
                      <div className="relative z-10">
                        {pin.length > index ? (
                          <div className="w-6 h-6 bg-gradient-to-br from-[#507295] to-[#4a6b8a] rounded-full shadow-lg flex items-center justify-center">
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                          </div>
                        ) : pin.length === index ? (
                          <div className="w-5 h-5 border-3 border-[#aac01d] rounded-full animate-pulse"></div>
                        ) : (
                          <div className="w-4 h-4 border-2 border-gray-400 rounded-full opacity-40"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Hidden Input */}
                <input
                  ref={pinInputRef}
                  id="pin-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pin}
                  onChange={handlePinChange}
                  onKeyDown={handleKeyDown}
                  className="sr-only"
                  maxLength={6}
                  autoComplete="off"
                  autoFocus
                  disabled={loading || success || isLocked}
                  data-pin-input="true"
                  aria-label="Enter 6-digit security code"
                  aria-describedby="pin-progress"
                />
                
                {/* Progress Indicator */}
                <div className="w-full max-w-sm mx-auto space-y-4">
                  {/* Main Progress Counter */}
                  <div className="flex justify-center">
                    <div className="bg-gradient-to-r from-[#507295]/10 via-white to-[#aac01d]/10 border-2 border-[#507295]/20 rounded-2xl px-6 py-3 shadow-lg">
                      <div className="text-center">
                        <div id="pin-progress" className="text-3xl font-black text-[#507295] tracking-wider" aria-live="polite">
                          <span className="text-4xl">{String(pin.length).padStart(2, '0')}</span>
                          <span className="text-2xl text-gray-400 mx-2">/</span>
                          <span className="text-3xl text-[#aac01d]">06</span>
                        </div>
                        <div className="text-xs text-gray-500 font-medium mt-1 tracking-wide">
                          DIGITS ENTERED
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="relative">
                    <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full bg-gradient-to-r from-[#507295] via-[#6b8bb3] to-[#aac01d] rounded-full transition-all duration-700 ease-out shadow-sm ${animatePulse ? 'animate-pulse' : ''}`}
                        style={{ width: `${(pin.length / 6) * 100}%` }}
                      ></div>
                    </div>
                    {/* Progress dots */}
                    <div className="absolute -top-1 left-0 right-0 flex justify-between px-1">
                      {Array.from({ length: 7 }, (_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            i <= pin.length 
                              ? 'bg-[#507295] shadow-md scale-125' 
                              : 'bg-gray-300'
                          }`}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Instructions */}
                <div className="text-center space-y-3">
                  <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-lg font-semibold text-[#507295] mb-2">
                      🔐 Enter Your Security Code
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      Type your 6-digit PIN to access the system
                    </p>
                    {/* Attempt Counter */}
                    {attemptsLeft < 5 && (
                      <div className="flex items-center justify-center space-x-2 text-amber-600">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                        <p className="text-xs font-semibold">
                          {attemptsLeft} attempts remaining
                        </p>
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                      </div>
                    )}
                  </div>

                  {/* Lockout Status */}
                  {isLocked && (
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-center justify-center space-x-2 text-red-600 mb-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <p className="text-sm font-bold">🔒 Account Temporarily Locked</p>
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                      </div>
                      {lockoutCountdown && (
                        <div className="text-center mb-2">
                          <div className="inline-flex items-center space-x-2 bg-red-100 px-3 py-1 rounded-full">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-mono font-bold text-red-700">
                              {lockoutCountdown}
                            </span>
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-red-600 text-center">
                        {lockoutCountdown 
                          ? `Please wait ${lockoutCountdown} before trying again. PIN input is disabled during lockout.`
                          : 'Please wait before trying again. PIN input is disabled during lockout.'
                        }
                      </p>
                    </div>
                  )}
                  
                  {!isLocked && pin.length === 0 && (
                    <div className="flex items-center justify-center space-x-2 text-gray-500">
                      <div className="w-2 h-2 bg-[#aac01d] rounded-full animate-bounce"></div>
                      <p className="text-xs font-medium">Tap the PIN boxes or start typing</p>
                      <div className="w-2 h-2 bg-[#aac01d] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  )}
                  
                  {pin.length > 0 && pin.length < 6 && (
                    <div className="flex items-center justify-center space-x-2 text-[#507295]">
                      <div className="w-2 h-2 bg-[#507295] rounded-full animate-pulse"></div>
                      <p className="text-sm font-medium">Keep going... {6 - pin.length} more digits</p>
                      <div className="w-2 h-2 bg-[#507295] rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                  )}
                  
                  {pin.length === 6 && (
                    <div className="flex items-center justify-center space-x-2 text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                      <p className="text-sm font-bold">Perfect! Ready to continue</p>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <Alert variant="destructive" className="border-2 border-red-300 bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl shadow-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-red-800 mb-1">Access Denied</h4>
                        <AlertDescription className="text-red-700 font-medium">{error}</AlertDescription>
                        <p className="text-xs text-red-600 mt-1">Please check your security code and try again</p>
                      </div>
                    </div>
                  </Alert>
                </div>
              )}
              
              {/* Enhanced visual separator */}
              <div className="relative py-3 my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-xs text-gray-500 bg-white">
                    Secure Entry
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={pin.length !== 6 || loading || success || isLocked}
                className={`w-full h-14 font-bold text-lg rounded-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden ${
                  success 
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-green-200 ring-4 ring-green-200" 
                    : isLocked
                    ? "bg-gradient-to-r from-red-400 to-red-500 cursor-not-allowed opacity-60"
                    : pin.length === 6
                    ? "bg-gradient-to-r from-[#507295] to-[#aac01d] hover:from-[#4a6b8a] hover:to-[#96b216] shadow-xl hover:shadow-2xl ring-4 ring-[#507295]/20"
                    : "bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed opacity-60"
                } text-white shadow-lg`}
                aria-label={
                  success 
                    ? "Access granted"
                    : loading 
                    ? "Verifying security code"
                    : isLocked
                    ? "Account locked - please wait"
                    : pin.length === 6
                    ? "Continue to login"
                    : `Enter ${6 - pin.length} more digits`
                }
              >
                {/* Button glow effect */}
                <div className={`absolute inset-0 rounded-2xl ${
                  success 
                    ? 'bg-gradient-to-r from-green-400/20 to-emerald-400/20' 
                    : pin.length === 6
                    ? 'bg-gradient-to-r from-[#507295]/20 to-[#aac01d]/20'
                    : ''
                }`}></div>
                
                <div className="relative z-10 flex items-center justify-center">
                  {success ? (
                    <>
                      <CheckCircle className="h-6 w-6 mr-3 animate-bounce" />
                      <span>🎉 Access Granted!</span>
                    </>
                  ) : loading ? (
                    <>
                      <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                      <span>🔍 Verifying Security Code...</span>
                    </>
                  ) : isLocked ? (
                    <>
                      <Lock className="h-6 w-6 mr-3" />
                      <span>🔒 Account Locked</span>
                    </>
                  ) : pin.length === 6 ? (
                    <>
                      <Key className="h-6 w-6 mr-3" />
                      <span>🚀 Continue to Login</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-6 w-6 mr-3" />
                      <span>Enter {6 - pin.length} more digit{6 - pin.length !== 1 ? 's' : ''}</span>
                    </>
                  )}
                </div>
              </Button>
            </form>
          </CardContent>

          {/* Footer */}
          <div className="bg-gradient-to-b from-gray-50/50 to-gray-100/50 p-6 text-center">
            <div className="w-full">
              <p className="text-xs text-gray-500">
                Secure access powered by advanced encryption
              </p>
            </div>
          </div>
        </Card>

        {/* Additional Info */}
        <div className="text-center mt-6">
          <p className="text-white/70 text-xs">
            © 2024 Kardex. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
