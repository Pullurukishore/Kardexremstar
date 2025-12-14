import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, UserRole } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { JWT_CONFIG, REFRESH_TOKEN_CONFIG, generateRefreshToken, verifyRefreshToken } from '../config/auth';
import { sendEmail } from '../utils/email';
import prisma from '../config/db';

// Type for user data that's safe to return to the client
type SafeUser = {
  id: number;
  email: string;
  role: UserRole;
  customerId: number | null;
  isActive: boolean;
  customer?: {
    id: number;
    companyName: string;
    isActive: boolean;
  } | null;
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, role, name, phone, companyName } = req.body;

    // Validate required fields
    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password and role are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user data
    const userData: any = {
      email,
      password: hashedPassword,
      role,
      isActive: true,
      tokenVersion: '0' // Initialize token version as string
    };

    // Handle customer owner registration
    if (role === 'CUSTOMER_OWNER' && companyName) {
      // Get admin user or system user ID for createdBy/updatedBy
      const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true }
      });
      
      const systemUserId = adminUser?.id || 1; // Fallback to 1 if no admin found

      // Get the first active service zone or create a default one if none exists
      let serviceZone = await prisma.serviceZone.findFirst({
        where: { isActive: true }
      });

      if (!serviceZone) {
        // Create a default service zone if none exists
        serviceZone = await prisma.serviceZone.create({
          data: {
            name: 'Default Service Zone',
            description: 'Default service zone for new customers',
            isActive: true
          }
        });
      }

      // Create customer with the service zone
      const customer = await prisma.customer.create({
        data: {
          companyName,
          isActive: true,
          serviceZone: {
            connect: { id: serviceZone.id }
          },
          createdBy: {
            connect: { id: systemUserId }
          },
          updatedBy: {
            connect: { id: systemUserId }
          }
        }
      });

      // Create contact
      await prisma.contact.create({
        data: {
          name: name || '',
          email,
          phone: phone || '',
          role: 'ACCOUNT_OWNER',
          customerId: customer.id
        }
      });

      userData.customerId = customer.id;
    }

    // Create user
    const user = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        role: true,
        customerId: true,
        isActive: true,
        customer: {
          select: {
            id: true,
            companyName: true,
            isActive: true
          }
        }
      }
    });

    // Generate tokens
    const token = jwt.sign(
      { id: user.id, role: user.role, customerId: user.customerId },
      JWT_CONFIG.secret,
      { expiresIn: '1d' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      REFRESH_TOKEN_CONFIG.secret,
      { expiresIn: '7d' }
    );

    // Save refresh token to database
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    // Set HTTP-only cookies
    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      path: '/'
    });
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      path: '/'
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });

    // Return user and token
    res.status(201).json({
      user,
      token // Also return token for clients that need it
    });

  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Find user with customer info
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        customer: true
      }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ 
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Check for account lockout
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      return res.status(403).json({
        success: false,
        message: 'Account locked due to too many failed login attempts. Please try again later or reset your password.',
        code: 'ACCOUNT_LOCKED',
        retryAfter: Math.ceil((user.accountLockedUntil.getTime() - Date.now()) / 1000) // seconds until unlock
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Update failed login attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const MAX_ATTEMPTS = 5;
      const LOCKOUT_MINUTES = 15;
      
      const updateData: any = {
        failedLoginAttempts: failedAttempts,
        lastFailedLogin: new Date()
      };

      if (failedAttempts >= MAX_ATTEMPTS) {
        const lockoutTime = new Date();
        lockoutTime.setMinutes(lockoutTime.getMinutes() + LOCKOUT_MINUTES);
        updateData.accountLockedUntil = lockoutTime;
        updateData.failedLoginAttempts = 0; // Reset after lockout
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData
      });

      const attemptsLeft = MAX_ATTEMPTS - failedAttempts;
      return res.status(401).json({
        success: false,
        message: attemptsLeft > 0 
          ? `Invalid email or password. ${attemptsLeft} attempt(s) left.`
          : 'Account locked due to too many failed attempts. Please try again later.',
        code: attemptsLeft > 0 ? 'INVALID_CREDENTIALS' : 'ACCOUNT_LOCKED',
        ...(attemptsLeft <= 0 && { 
          retryAfter: LOCKOUT_MINUTES * 60 // seconds
        })
      });
    }

    // Reset failed login attempts on successful login
    if (user.failedLoginAttempts > 0 || user.accountLockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          accountLockedUntil: null
        }
      });
    }

    // CONCURRENT SESSION SUPPORT:
    // Don't invalidate existing tokens when user logs in from another device
    // This prevents infinite redirects on the first device
    // Only generate new token version if user doesn't have one or it's been compromised
    let tokenVersion = user.tokenVersion;
    if (!tokenVersion || tokenVersion === '0') {
      tokenVersion = Math.random().toString(36).substring(2, 15);
    }
    
    // Generate tokens with existing or new version
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role, 
        customerId: user.customerId,
        version: tokenVersion
      },
      JWT_CONFIG.secret,
      { expiresIn: '1d' }
    );

    const refreshToken = jwt.sign(
      { 
        id: user.id,
        version: tokenVersion
      },
      REFRESH_TOKEN_CONFIG.secret,
      { expiresIn: '7d' }
    );

    // Update user with login info but preserve existing refreshToken for concurrent sessions
    // Only update refreshToken if user doesn't have one or it's expired
    const updateData: any = {
      lastLoginAt: new Date(),
      lastActiveAt: new Date()
    };

    // Only update tokenVersion and refreshToken if this is the first login or token was compromised
    if (!user.tokenVersion || user.tokenVersion === '0' || !user.refreshToken) {
      updateData.tokenVersion = tokenVersion;
      updateData.refreshToken = refreshToken;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    // Set HTTP-only cookies with secure settings
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'lax' | 'strict' | 'none';
      maxAge: number;
      path: string;
    } = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax', // Using 'lax' for better compatibility
      maxAge: 24 * 60 * 60 * 1000, // 1 day for access token
      path: '/'
    };

    res.cookie('accessToken', token, cookieOptions);
    res.cookie('token', token, cookieOptions);
    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days for refresh token
    });

    // Return user data without sensitive information
    const { password: _, refreshToken: rt, tokenVersion: tv, ...userData } = user;
    
    // For backward compatibility, include both token and accessToken
    res.json({
      success: true,
      user: {
        ...userData,
        customer: user.customer
      },
      token, // For backward compatibility
      accessToken: token, // New standard field
      refreshToken: rt // Include refresh token in the response
    });

  } catch (error: unknown) {
    // Define a type for the error response
    type ErrorResponse = {
      success: boolean;
      message: string;
      code: string;
      error?: string;
      stack?: string;
    };
    
    const errorResponse: ErrorResponse = {
      success: false,
      message: 'An error occurred during login',
      code: 'INTERNAL_SERVER_ERROR'
    };
    
    if (error instanceof Error) {
      if (process.env.NODE_ENV === 'development') {
        errorResponse.error = error.message;
        if ('stack' in error) {
          errorResponse.stack = (error as Error & { stack?: string }).stack;
        }
      }
    }
    
    res.status(500).json(errorResponse);
  }
};

export const getCurrentUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        customerId: true,
        zoneId: true,
        isActive: true,
        customer: {
          select: {
            id: true,
            companyName: true,
            isActive: true,
            serviceZoneId: true,
            serviceZone: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        serviceZones: {
          select: {
            serviceZoneId: true,
            serviceZone: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.id) {
      // Clear refresh token from database
      await prisma.user.update({
        where: { id: req.user.id },
        data: { refreshToken: null }
      });
    }

    // Clear cookies
    const clearCookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const
    };
    
    res.clearCookie('accessToken', clearCookieOptions);
    res.clearCookie('token', clearCookieOptions);
    res.clearCookie('refreshToken', clearCookieOptions);
    res.clearCookie('userRole', clearCookieOptions);

    // Also clear non-httpOnly cookies that might be set on client side
    const clientCookieOptions = {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const
    };
    res.clearCookie('userRole', clientCookieOptions);

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ 
        success: false,
        message: 'Refresh token required',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    // Verify refresh token using helper function
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (verifyError) {
      if (verifyError instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ 
          success: false,
          message: 'Refresh token expired. Please login again.',
          code: 'REFRESH_TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({ 
        success: false,
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Find user with refresh token
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        customerId: true,
        isActive: true,
        refreshToken: true,
        tokenVersion: true
      }
    });
    // Validate user exists and is active
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        success: false,
        message: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // For concurrent sessions, be more flexible with refresh token validation
    // Check if the refresh token is valid for this user and version
    let isValidRefreshToken = false;
    
    try {
      // Verify the refresh token structure and user ID match
      const refreshDecoded = jwt.verify(refreshToken, REFRESH_TOKEN_CONFIG.secret) as any;
      if (refreshDecoded.id === user.id && refreshDecoded.version === user.tokenVersion) {
        isValidRefreshToken = true;
      } else if (refreshDecoded.id === user.id && refreshDecoded.version !== user.tokenVersion) {
        // Version mismatch - token was revoked
        return res.status(401).json({ 
          success: false,
          message: 'Token version mismatch. Please login again.',
          code: 'TOKEN_VERSION_MISMATCH'
        });
      }
    } catch (refreshError) {
      if (refreshError instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ 
          success: false,
          message: 'Refresh token expired. Please login again.',
          code: 'REFRESH_TOKEN_EXPIRED'
        });
      } else if (refreshError instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ 
          success: false,
          message: 'Invalid refresh token format.',
          code: 'INVALID_TOKEN_FORMAT'
        });
      }
    }
    
    // Also check if it matches the stored refresh token (for backward compatibility)
    if (!isValidRefreshToken && user.refreshToken === refreshToken) {
      isValidRefreshToken = true;
    }
    
    if (!isValidRefreshToken) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid refresh token',
        code: 'TOKEN_MISMATCH'
      });
    }

    // Generate new access token
    const newToken = jwt.sign(
      { 
        id: user.id, 
        role: user.role, 
        customerId: user.customerId,
        version: user.tokenVersion
      },
      JWT_CONFIG.secret,
      { expiresIn: JWT_CONFIG.expiresIn }
    );

    // For concurrent sessions, don't rotate refresh tokens aggressively
    // Only rotate if the refresh token is old (more than 3 days)
    const shouldRotateRefreshToken = false; // Disabled for concurrent session support
    let newRefreshToken = refreshToken;
    
    if (shouldRotateRefreshToken) {
      newRefreshToken = generateRefreshToken(user.id);
      // Update stored refresh token
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          refreshToken: newRefreshToken,
          lastActiveAt: new Date()
        }
      });
    } else {
      // Just update last active time without changing refresh token
      await prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() }
      });
    }

    // Set cookies with new tokens
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 24 * 60 * 60 * 1000, // 1 day for access token
      path: '/'
    };
    
    res.cookie('accessToken', newToken, cookieOptions);
    res.cookie('token', newToken, cookieOptions);
    res.cookie('userRole', user.role, cookieOptions);
    
    if (shouldRotateRefreshToken) {
      res.cookie('refreshToken', newRefreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days for refresh token
      });
    }
    const responseData: any = { 
      success: true,
      accessToken: newToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        customerId: user.customerId
      }
    };

    // Only include refreshToken in response if it was rotated
    if (shouldRotateRefreshToken) {
      responseData.refreshToken = newRefreshToken;
    }

    res.json(responseData);

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ 
        success: false,
        message: 'Refresh token expired',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid refresh token',
        code: 'INVALID_JWT'
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required',
        code: 'MISSING_EMAIL'
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        isActive: true
      }
    });

    // Always return success to prevent email enumeration attacks
    const successResponse = {
      success: true,
      message: 'If an account with that email exists, we have sent a password reset link.',
      code: 'RESET_EMAIL_SENT'
    };

    if (!user || !user.isActive) {
      // Still return success but don't send email
      return res.json(successResponse);
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // 1 hour expiry

    // Save reset token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetTokenExpiry
      }
    });

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;

    // Send reset email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request - KardexCare',
        template: 'password-reset',
        context: {
          resetUrl,
          currentYear: new Date().getFullYear()
        }
      });
    } catch (emailError) {
      // Don't reveal email sending failure to prevent enumeration
    }

    res.json(successResponse);

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'An error occurred while processing your request',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
        code: 'INVALID_PASSWORD_LENGTH'
      });
    }

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date() // Token must not be expired
        },
        isActive: true
      },
      select: {
        id: true,
        email: true
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
        code: 'INVALID_RESET_TOKEN'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0, // Reset failed attempts
        accountLockedUntil: null, // Clear any account locks
        lastPasswordChange: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Password has been reset successfully',
      code: 'PASSWORD_RESET_SUCCESS'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'An error occurred while resetting your password',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};