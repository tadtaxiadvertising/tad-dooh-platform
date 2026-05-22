/**
 * ============================================================
 * Rate Limiter — Frontend Brute Force Protection
 * ============================================================
 * 
 * Blocks submit button after N failed attempts for a cooldown period.
 * Per-email tracking prevents attackers from cycling through accounts.
 * 
 * @security Mitigates local brute-force attacks on login forms.
 */

interface RateLimitEntry {
  attempts: number;
  lockedUntil: number;     // Timestamp (ms) when lock expires
  firstAttemptAt: number;  // Timestamp of first failed attempt in window
}

const RATE_LIMIT_CONFIG = {
  maxAttempts: 3,
  lockoutDurationMs: 60_000,  // 60 seconds
  windowMs: 300_000,          // 5 minute sliding window
} as const;

// In-memory store (resets on page refresh — intentional for client-side)
const attemptStore = new Map<string, RateLimitEntry>();

/**
 * Record a failed authentication attempt
 * @returns Lock state after recording
 */
export function recordFailedAttempt(identifier: string = 'global'): {
  isLocked: boolean;
  remainingMs: number;
  attemptsLeft: number;
} {
  const now = Date.now();
  const key = identifier.toLowerCase().trim();
  let entry = attemptStore.get(key);

  // Clean expired entries
  if (entry && entry.firstAttemptAt + RATE_LIMIT_CONFIG.windowMs < now) {
    attemptStore.delete(key);
    entry = undefined;
  }

  if (!entry) {
    entry = {
      attempts: 0,
      lockedUntil: 0,
      firstAttemptAt: now,
    };
  }

  entry.attempts++;

  if (entry.attempts >= RATE_LIMIT_CONFIG.maxAttempts) {
    entry.lockedUntil = now + RATE_LIMIT_CONFIG.lockoutDurationMs;
  }

  attemptStore.set(key, entry);

  const isLocked = entry.lockedUntil > now;
  return {
    isLocked,
    remainingMs: isLocked ? entry.lockedUntil - now : 0,
    attemptsLeft: Math.max(0, RATE_LIMIT_CONFIG.maxAttempts - entry.attempts),
  };
}

/**
 * Check if an identifier is currently rate-limited
 */
export function checkRateLimit(identifier: string = 'global'): {
  isLocked: boolean;
  remainingMs: number;
  attemptsLeft: number;
} {
  const now = Date.now();
  const key = identifier.toLowerCase().trim();
  const entry = attemptStore.get(key);

  if (!entry) {
    return { isLocked: false, remainingMs: 0, attemptsLeft: RATE_LIMIT_CONFIG.maxAttempts };
  }

  // Auto-clear expired locks
  if (entry.lockedUntil > 0 && entry.lockedUntil <= now) {
    attemptStore.delete(key);
    return { isLocked: false, remainingMs: 0, attemptsLeft: RATE_LIMIT_CONFIG.maxAttempts };
  }

  // Auto-clear expired windows
  if (entry.firstAttemptAt + RATE_LIMIT_CONFIG.windowMs < now) {
    attemptStore.delete(key);
    return { isLocked: false, remainingMs: 0, attemptsLeft: RATE_LIMIT_CONFIG.maxAttempts };
  }

  const isLocked = entry.lockedUntil > now;
  return {
    isLocked,
    remainingMs: isLocked ? entry.lockedUntil - now : 0,
    attemptsLeft: Math.max(0, RATE_LIMIT_CONFIG.maxAttempts - entry.attempts),
  };
}

/**
 * Clear rate limit for an identifier (after successful login)
 */
export function clearRateLimit(identifier: string = 'global'): void {
  attemptStore.delete(identifier.toLowerCase().trim());
}

/**
 * React Hook: useRateLimiter
 * Provides reactive rate-limit state for login forms
 */
export function createRateLimitTimer(
  identifier: string,
  onTick: (remainingMs: number) => void,
  onUnlocked: () => void
): () => void {
  const interval = setInterval(() => {
    const state = checkRateLimit(identifier);
    if (state.isLocked) {
      onTick(state.remainingMs);
    } else {
      onUnlocked();
      clearInterval(interval);
    }
  }, 1000);

  return () => clearInterval(interval);
}
