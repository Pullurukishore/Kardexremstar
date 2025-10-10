import jwt from 'jsonwebtoken';

// Import the UserRole enum from Prisma client
import { UserRole } from '@prisma/client';

export { UserRole };

// Get secrets from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

if (!REFRESH_TOKEN_SECRET || REFRESH_TOKEN_SECRET.length < 32) {
  throw new Error('REFRESH_TOKEN_SECRET must be at least 32 characters long');
}

interface JwtPayload {
  id: number;
  role: UserRole;
  iat: number;
  exp: number;
}

// OTP configuration
export const OTP_CONFIG = {
  expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10'), // Default 10 minutes
  length: 6
} as const;

export const JWT_CONFIG = {
  secret: JWT_SECRET,
  expiresIn: '1d' as const
};

export const REFRESH_TOKEN_CONFIG = {
  secret: REFRESH_TOKEN_SECRET,
  expiresIn: '7d' as const
};

export const generateToken = (userId: number, role: UserRole): string => {
  if (!JWT_CONFIG.secret) {
    throw new Error('JWT secret is not configured');
  }
  return jwt.sign(
    { id: userId, role },
    JWT_CONFIG.secret,
    { expiresIn: JWT_CONFIG.expiresIn }
  );
}

export function verifyToken(token: string): JwtPayload {
  if (!JWT_CONFIG.secret) {
    throw new Error('JWT secret is not configured');
  }
  return jwt.verify(token, JWT_CONFIG.secret) as JwtPayload;
}
