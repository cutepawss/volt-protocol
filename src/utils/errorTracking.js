/**
 * Error Tracking Utility
 * 
 * Provides error tracking functionality using Sentry (or similar service)
 * Falls back gracefully if not configured
 */

let errorTracker = null;

import { SENTRY_CONFIG } from '../config';

/**
 * Initialize error tracking
 */
export const initErrorTracking = () => {
  if (!SENTRY_CONFIG.enabled || !SENTRY_CONFIG.dsn) {
    if (import.meta.env.DEV) {
      console.log('Error tracking not configured (VITE_SENTRY_DSN not set)');
    }
    return;
  }

  try {
    // Dynamic import to avoid bundling Sentry in development if not needed
    // In production, you would install @sentry/react:
    // npm install @sentry/react
    //
    // import * as Sentry from '@sentry/react';
    // Sentry.init({
    //   dsn,
    //   environment,
    //   integrations: [
    //     new Sentry.BrowserTracing(),
    //   ],
    //   tracesSampleRate: 1.0,
    // });
    // errorTracker = Sentry;

    console.log('Error tracking would be initialized with DSN:', SENTRY_CONFIG.dsn);
    console.log('To enable: npm install @sentry/react and uncomment code in src/utils/errorTracking.js');
  } catch (error) {
    console.error('Failed to initialize error tracking:', error);
  }
};

/**
 * Capture an exception
 */
export const captureException = (error, context = {}) => {
  if (errorTracker) {
    errorTracker.captureException(error, { extra: context });
  } else {
    // Fallback: log to console in development
    if (import.meta.env.DEV) {
      console.error('Error captured:', error, context);
    }
  }
};

/**
 * Capture a message
 */
export const captureMessage = (message, level = 'info', context = {}) => {
  if (errorTracker) {
    errorTracker.captureMessage(message, { level, extra: context });
  } else {
    // Fallback: log to console in development
    if (import.meta.env.DEV) {
      console.log(`[${level.toUpperCase()}]`, message, context);
    }
  }
};

/**
 * Set user context for error tracking
 */
export const setUserContext = (user) => {
  if (errorTracker) {
    errorTracker.setUser({
      id: user.address,
      address: user.address,
    });
  }
};

/**
 * Clear user context
 */
export const clearUserContext = () => {
  if (errorTracker) {
    errorTracker.setUser(null);
  }
};

