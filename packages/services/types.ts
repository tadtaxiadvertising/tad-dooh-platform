/**
 * Type definitions for auth service
 */

export interface Session {
  access_token: string;
  user?: {
    id: string;
    email: string;
    user_metadata?: Record<string, unknown>;
  };
}

export interface AuthConfig {
  sessionCacheTTL: number;
}

export interface CachedSessionState {
  session: Session | null;
  timestamp: number;
}

export interface ErrorContext {
  baseURL?: string;
  url?: string;
  code?: string;
  message?: string;
}
