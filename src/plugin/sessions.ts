/**
 * Session Persistence System
 * 
 * Tracks which account was last used for a specific conversation (sessionID).
 * Helps preserve prompt cache and improves model performance.
 */

export class SessionAccountManager {
  private readonly sessionToAccount = new Map<string, number>()

  /**
   * Record that an account was used for a session.
   */
  recordUse(sessionId: string, accountIndex: number): void {
    this.sessionToAccount.set(sessionId, accountIndex)
  }

  /**
   * Get the last used account index for a session.
   */
  getLastUsedAccount(sessionId: string): number | null {
    return this.sessionToAccount.get(sessionId) ?? null
  }

  /**
   * Clear session data.
   */
  clear(sessionId: string): void {
    this.sessionToAccount.delete(sessionId)
  }
}

let globalSessionManager: SessionAccountManager | null = null

export function getSessionAccountManager(): SessionAccountManager {
  if (!globalSessionManager) {
    globalSessionManager = new SessionAccountManager()
  }
  return globalSessionManager
}
