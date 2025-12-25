/**
 * Enhanced Admin Authentication Middleware
 * Client-safe exports and server-side authentication
 */

// Re-export types and client utilities
export * from '../types/auth';

// Re-export server-side services (these will only work on the server)
export { AdminAuthService, AuditLogService } from './auth-server';