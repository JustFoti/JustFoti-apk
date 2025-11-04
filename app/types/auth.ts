/**
 * Authentication Types
 */

export interface AdminUser {
  id: string;
  username: string;
  createdAt: number;
  lastLogin: number | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  token: string;
  expiresAt: number;
}

export interface JWTPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}

export interface AuthSession {
  user: AdminUser;
  token: string;
  expiresAt: number;
}

export interface LoginResponse {
  success: boolean;
  user?: AdminUser;
  error?: string;
}

export interface AuthError {
  code: 'INVALID_CREDENTIALS' | 'RATE_LIMITED' | 'SERVER_ERROR' | 'UNAUTHORIZED';
  message: string;
}
