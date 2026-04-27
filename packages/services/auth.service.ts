/**
 * Auth Service - Centralized session and token management
 * Follows Single Responsibility Principle
 */

import { supabase } from './supabase';
import type { CachedSessionState, Session } from './types';

const SESSION_CACHE_TTL = 1000 * 60 * 2; // 2 minutes
let cachedSessionState: CachedSessionState = { session: null, timestamp: 0 };
let sessionFetchPromise: Promise<Session | null> | null = null;

/**
 * Get valid session with race condition prevention
 * Uses promise coalescing for concurrent requests
 */
export const getValidSession = async (): Promise<Session | null> => {
  const now = Date.now();
  
  // Return cached session if valid
  if (cachedSessionState.session && (now - cachedSessionState.timestamp <= SESSION_CACHE_TTL)) {
    return cachedSessionState.session;
  }
  
  // Coalesce concurrent fetch requests to single Supabase call
  if (!sessionFetchPromise) {
    sessionFetchPromise = supabase.auth.getSession()
      .then(({ data: { session } }) => {
        cachedSessionState = { session: session as Session | null, timestamp: Date.now() };
        sessionFetchPromise = null;
        return session as Session | null;
      })
      .catch((error: Error) => {
        sessionFetchPromise = null;
        console.error('⚠️ Session fetch failed:', error);
        return cachedSessionState.session; // Fallback to stale session if fetch fails
      });
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
