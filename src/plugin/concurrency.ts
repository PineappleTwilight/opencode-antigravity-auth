/**
 * Concurrency Tracking System
 * 
 * Monitors active requests per account to prevent over-saturation.
 * Used by rotation strategies to distribute load more evenly.
 */

export class ConcurrencyTracker {
  private readonly activeRequests = new Map<number, number>();

  /**
   * Record a new active request for an account.
   */
  increment(accountIndex: number): void {
    const current = this.activeRequests.get(accountIndex) ?? 0;
    this.activeRequests.set(accountIndex, current + 1);
  }

  /**
   * Record request completion for an account.
   */
  decrement(accountIndex: number): void {
    const current = this.activeRequests.get(accountIndex) ?? 0;
    if (current > 0) {
      this.activeRequests.set(accountIndex, current - 1);
    }
  }

  /**
   * Get number of active requests for an account.
   */
  getActiveCount(accountIndex: number): number {
    return this.activeRequests.get(accountIndex) ?? 0;
  }

  /**
   * Reset tracking for an account.
   */
  reset(accountIndex: number): void {
    this.activeRequests.delete(accountIndex);
  }
}

let globalConcurrencyTracker: ConcurrencyTracker | null = null;

export function getConcurrencyTracker(): ConcurrencyTracker {
  if (!globalConcurrencyTracker) {
    globalConcurrencyTracker = new ConcurrencyTracker();
  }
  return globalConcurrencyTracker;
}
