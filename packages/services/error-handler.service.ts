/**
 * Error Handler Service - Centralized API error handling
 * Follows Single Responsibility Principle
 */

import { AxiosError } from 'axios';
import { performLogout, getLoginPath, isPublicPath } from './auth.service';
import type { ErrorContext } from './types';

/**
 * Handle network errors
 */
export const handleNetworkError = (error: AxiosError): boolean => {
  if (!error.response && (error.message === 'Network Error' || error.code === 'ECONNABORTED')) {
    const context: ErrorContext = {
      baseURL: error.config?.baseURL,
      url: error.config?.url,
      code: error.code,
      message: error.message,
    };
    console.error('📡 NETWORK ERROR:', context);
    return true;
  }
  return false;
};

/**
 * Handle payment required errors (402)
 */
export const handlePaymentError = (error: AxiosError): boolean => {
  if (error.response?.status === 402) {
    try {
      const { usePaymentStore } = require('@tad/store');
      const message = (error.response?.data as Record<string, unknown>)?.message || 'Suscripción de RD$6,000 pendiente';
      usePaymentStore.getState().setLock(true, message);
      return true;
    } catch (e) {
      console.error('⚠️ Payment store access failed:', e);
    }
  }
  return false;
};

/**
 * Handle unauthorized errors (401)
 */
export const handleUnauthorizedError = async (error: AxiosError): Promise<boolean> => {
  if (error.response?.status === 401 && typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    
    if (!isPublicPath(currentPath)) {
      await performLogout(currentPath);
      
      const loginPath = getLoginPath(currentPath);
      
      // Prevent infinite login loops
      if (window.location.href.indexOf(loginPath) === -1) {
        setTimeout(() => {
          window.location.href = loginPath;
        }, 100);
      }
      return true;
    }
  }
  return false;
};

/**
 * Process all error types in order
 */
export const processApiError = async (error: AxiosError): Promise<never> => {
  handleNetworkError(error);
  handlePaymentError(error);
  await handleUnauthorizedError(error);
  return Promise.reject(error);
};
