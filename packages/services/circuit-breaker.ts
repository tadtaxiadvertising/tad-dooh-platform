/**
 * ============================================================
 * Circuit Breaker — Silent Fail Prevention
 * ============================================================
 * 
 * Implements the Circuit Breaker pattern for Supabase Auth calls.
 * When the service is down, it:
 * 1. Fails fast instead of hanging
 * 2. Shows maintenance state vs blank screen
 * 3. Auto-recovers after cooldown period
 * 
 * States: CLOSED (normal) → OPEN (failing) → HALF_OPEN (testing)
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;     // Failures before opening circuit
  resetTimeoutMs: number;       // Time before attempting recovery
  halfOpenMaxAttempts: number;  // Max test calls in HALF_OPEN
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  resetTimeoutMs: 30_000,      // 30 seconds
  halfOpenMaxAttempts: 1,
};

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // If circuit is OPEN, check if enough time has passed to try again
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.config.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.halfOpenAttempts = 0;
      } else {
        throw new CircuitBreakerOpenError(
          'Servicio temporalmente no disponible. Reintentando en breve.',
          this.getRemainingCooldownMs()
        );
      }
    }

    // If HALF_OPEN, limit test calls
    if (this.state === 'HALF_OPEN' && this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
      throw new CircuitBreakerOpenError(
        'Servicio en modo de recuperación. Por favor espera unos segundos.',
        this.getRemainingCooldownMs()
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.halfOpenAttempts = 0;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      return;
    }

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit is open (service down)
   */
  isOpen(): boolean {
    return this.state === 'OPEN';
  }

  /**
   * Get remaining cooldown time in ms
   */
  getRemainingCooldownMs(): number {
    if (this.state !== 'OPEN') return 0;
    const elapsed = Date.now() - this.lastFailureTime;
    return Math.max(0, this.config.resetTimeoutMs - elapsed);
  }

  /**
   * Force reset circuit breaker (manual override)
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.halfOpenAttempts = 0;
  }
}

/**
 * Custom error for circuit breaker open state
 */
export class CircuitBreakerOpenError extends Error {
  public readonly remainingMs: number;

  constructor(message: string, remainingMs: number) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
    this.remainingMs = remainingMs;
  }
}

// ── Singleton for Auth Circuit Breaker ────────────────────────
let authCircuitBreaker: CircuitBreaker | null = null;

export function getAuthCircuitBreaker(): CircuitBreaker {
  if (!authCircuitBreaker) {
    authCircuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 30_000,
    });
  }
  return authCircuitBreaker;
}
