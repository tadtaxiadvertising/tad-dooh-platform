/**
 * Auth Service - Centralized session and token management
 * Follows Single Responsibility Principle
 */

import { supabase } from './supabase';
import type { CachedSessionState, Session } from './types';

const SESSION_CACHE_TTL = 1000 * 60 * 2; // 2 minutes
/**
 * Proactive refresh window: if the token expires within this many seconds,
 * we refresh BEFORE sending the request to prevent a 401.
 */
const TOKEN_REFRESH_BUFFER_SECS = 300; // 5 minutes

let cachedSessionState: CachedSessionState = { session: null, timestamp: 0 };
let sessionFetchPromise: Promise<Session | null> | null = null;

/**
 * Returns true if the access token in the session will expire within the buffer window.
 */
const isTokenExpiringSoon = (session: Session): boolean => {
  // Supabase JWT includes `exp` (Unix timestamp in seconds)
  const expiresAt = (session as any).expires_at; // seconds since epoch
  if (!expiresAt) return false;
  const secondsUntilExpiry = expiresAt - Math.floor(Date.now() / 1000);
  return secondsUntilExpiry < TOKEN_REFRESH_BUFFER_SECS;
};

/**
 * Get valid session with race condition prevention and proactive token refresh.
 * Uses promise coalescing for concurrent requests.
 *
 * FIX (2026-05-09): Added proactive refresh when the token is within 5 minutes
 * of expiry, preventing cascading 401 errors on protected API calls.
 */
export const getValidSession = async (): Promise<Session | null> => {
  const now = Date.now();
  
  // Return cached session if fresh AND the token is not about to expire
  if (
    cachedSessionState.session &&
    now - cachedSessionState.timestamp <= SESSION_CACHE_TTL &&
    !isTokenExpiringSoon(cachedSessionState.session)
  ) {
    return cachedSessionState.session;
  }
  
  // Coalesce concurrent fetch requests to a single Supabase call
  if (!sessionFetchPromise) {
    sessionFetchPromise = (async () => {
      try {
        // Step 1: Get the current session from the Supabase client
        let { data: { session } } = await supabase.auth.getSession();

        // Step 1.5: Recovery Fallback (If Supabase client is empty but we have tokens in localStorage)
        if (!session && typeof window !== 'undefined') {
          const localToken = localStorage.getItem('tad_admin_token') || 
                            localStorage.getItem('tad_advertiser_token') || 
                            localStorage.getItem('tad_driver_token');
          const refreshToken = localStorage.getItem('tad_admin_refresh_token');
          
          if (localToken && refreshToken) {
            console.info('🔄 [AUTH] Recuperando sesión desde localStorage...');
            const { data: recovered, error: recoveryError } = await supabase.auth.setSession({
              access_token: localToken,
              refresh_token: refreshToken
            });
            if (!recoveryError && recovered.session) {
              session = recovered.session;
            }
          }
        }

        // Step 2: If session exists but token is expiring soon, force a refresh
        if (session && isTokenExpiringSoon(session as Session)) {
          console.info('🔄 [AUTH] Token expira pronto — refrescando sesión proactivamente...');
          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.warn('⚠️ [AUTH] Refresco de sesión falló:', refreshError.message);
            // Return the original (still technically valid) session as fallback
            const fallback = session as Session | null;
            cachedSessionState = { session: fallback, timestamp: Date.now() };
            return fallback;
          }
          const refreshedSession = refreshed.session as Session | null;
          cachedSessionState = { session: refreshedSession, timestamp: Date.now() };
          return refreshedSession;
        }

        const typedSession = session as Session | null;
        cachedSessionState = { session: typedSession, timestamp: Date.now() };
        return typedSession;
      } catch (error) {
        console.error('⚠️ Session fetch failed:', error);
        return cachedSessionState.session; // Fallback to stale session
      } finally {
        sessionFetchPromise = null;
      }
    })();
  }
  
  return sessionFetchPromise;
};

/**
 * Invalidate cached session (call after logout)
 */
export const invalidateSession = (): void => {
  cachedSessionState = { session: null, timestamp: 0 };
  sessionFetchPromise = null;
};

/**
 * Get token from localStorage with error handling
 */
export const getLocalStorageToken = (currentPath: string): string | null => {
  try {
    let localToken = null;
    if (currentPath.includes('/advertiser/')) {
      localToken = localStorage.getItem('tad_advertiser_token') || localStorage.getItem('tad_admin_token');
    } else if (currentPath.includes('/driver/')) {
      localToken = localStorage.getItem('tad_driver_token') || localStorage.getItem('tad_admin_token');
    } else {
      localToken = localStorage.getItem('tad_admin_token') || 
                   localStorage.getItem('tad_advertiser_token') || 
                   localStorage.getItem('tad_driver_token');
    }
    return localToken;
  } catch (e) {
    console.warn('⚠️ localStorage access failed:', e);
    return null;
  }
};

/**
 * Clear all tokens from localStorage
 */
export const clearLocalStorageTokens = (currentPath: string): void => {
  try {
    if (currentPath.includes('/advertiser/')) {
      localStorage.removeItem('tad_advertiser_token');
      localStorage.removeItem('tad_advertiser_user');
    } else if (currentPath.includes('/driver/')) {
      localStorage.removeItem('tad_driver_token');
      localStorage.removeItem('tad_driver_user');
    } else {
      localStorage.removeItem('tad_admin_token');
      localStorage.removeItem('tad_admin_user');
    }
  } catch (e) {
    console.warn('⚠️ localStorage clear failed:', e);
  }
};

/**
 * Perform full logout and cleanup
 */
export const performLogout = async (currentPath: string): Promise<void> => {
  console.warn('🚨 Unauthorized access detected. Clearing session.');
  
  // Clear cache
  invalidateSession();
  
  // Clear tokens
  clearLocalStorageTokens(currentPath);
  
  // Sign out from Supabase
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('⚠️ Supabase signOut failed:', e);
  }
  
  // Clear access token cookie (middleware)
  try {
    document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  } catch (e) {
    console.warn('⚠️ Cookie clear failed:', e);
  }
};

/**
 * Determine login path based on current route
 */
export const getLoginPath = (currentPath: string): string => {
  if (currentPath.includes('/advertiser/')) return '/advertiser/login';
  if (currentPath.includes('/driver/')) return '/driver/login';
  if (currentPath.includes('/admin/')) return '/admin/login';
  return '/login';
};

/**
 * Check if current path is public (no auth required)
 */
export const isPublicPath = (currentPath: string): boolean => {
  return currentPath.includes('/login') || 
         currentPath.includes('/check-in') || 
         currentPath.includes('/onboarding') ||
         currentPath === '/';
};
