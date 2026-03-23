import type { AccountManager } from "./accounts.ts"
import { checkAccountsQuota } from "./quota.ts"
import type { AccountMetadataV3 } from "./storage.ts"
import type { PluginClient } from "./types.ts"
import { createLogger } from "./logger.ts"

const log = createLogger("quota-sync")

/**
 * ProactiveQuotaSync handles background and on-demand quota synchronization.
 * It manages a queue of accounts that need refreshing and ensures that
 * refreshes are throttled and don't overwhelm the API.
 */
export class ProactiveQuotaSync {
  private refreshQueue = new Set<number>()
  private isProcessingQueue = false
  private isSyncingAll = false
  private syncTimer: ReturnType<typeof setInterval> | null = null
  private lastRefreshed = new Map<number, number>()

  constructor(
    private readonly accountManager: AccountManager,
    private readonly client: PluginClient,
    private readonly providerId: string,
    private readonly minIntervalMs: number = 30_000 // 30 seconds minimum between refreshes per account
  ) {}

  /**
   * Enqueue an account for quota refresh.
   * If the account was recently refreshed or is already in the queue, this may be ignored.
   */
  enqueue(accountIndex: number): void {
    const now = Date.now()
    const last = this.lastRefreshed.get(accountIndex) ?? 0
    if (now - last < this.minIntervalMs) {
      log.debug(`Skipping enqueue for account ${accountIndex}: recently refreshed`)
      return
    }

    if (this.refreshQueue.has(accountIndex)) {
      return
    }

    this.refreshQueue.add(accountIndex)
    log.debug(`Enqueued account ${accountIndex} for quota refresh`)
    
    // Process queue asynchronously
    void this.processQueue()
  }

  /**
   * Synchronize all enabled accounts.
   */
  async syncAll(accounts: AccountMetadataV3[]): Promise<void> {
    if (this.isSyncingAll) {
      log.debug("Sync all already in progress, skipping")
      return
    }
    this.isSyncingAll = true

    try {
      const enabledAccounts = accounts.filter(acc => acc.enabled !== false)
      if (enabledAccounts.length === 0) {
        log.debug("No enabled accounts to sync")
        return
      }

      log.debug(`Starting proactive sync for ${enabledAccounts.length} accounts`)
      const results = await checkAccountsQuota(enabledAccounts, this.client, this.providerId)
      
      const currentManagerAccounts = this.accountManager.getAccounts()
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const accountMetadata = enabledAccounts[i]
        
        if (result?.status === "ok" && result.quota?.groups && accountMetadata) {
          const matchedAccount = currentManagerAccounts.find(a => a.parts.refreshToken === accountMetadata.refreshToken)
          
          if (matchedAccount) {
            this.accountManager.updateQuotaCache(matchedAccount.index, result.quota.groups)
            this.lastRefreshed.set(matchedAccount.index, Date.now())
          }
        }
      }
      
      this.accountManager.requestSaveToDisk()
      log.debug("Proactive sync completed successfully")
    } catch (err) {
      log.error("Proactive sync all failed", { error: String(err) })
    } finally {
      this.isSyncingAll = false
    }
  }

  /**
   * Start a periodic background timer to sync all accounts.
   */
  startPeriodicSync(intervalMs: number): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
    }
    
    log.info(`Starting periodic quota sync every ${Math.round(intervalMs / 1000)}s`)
    this.syncTimer = setInterval(() => {
      const accounts = this.accountManager.getAccountsForQuotaCheck()
      void this.syncAll(accounts)
    }, intervalMs)
    
    // Run an initial sync immediately
    const accounts = this.accountManager.getAccountsForQuotaCheck()
    void this.syncAll(accounts)
  }

  /**
   * Stop the periodic background timer.
   */
  stopPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
      log.info("Stopped periodic quota sync")
    }
  }

  /**
   * Process the refresh queue.
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.refreshQueue.size === 0) {
      return
    }
    this.isProcessingQueue = true

    try {
      // Small delay to batch multiple enqueues
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const indices = Array.from(this.refreshQueue)
      this.refreshQueue.clear()

      const allAccounts = this.accountManager.getAccounts()
      const accountsToCheck: AccountMetadataV3[] = []

      for (const idx of indices) {
        const acc = allAccounts[idx]
        if (acc && acc.enabled !== false) {
          accountsToCheck.push({
            email: acc.email,
            refreshToken: acc.parts.refreshToken,
            projectId: acc.parts.projectId,
            managedProjectId: acc.parts.managedProjectId,
            addedAt: acc.addedAt,
            lastUsed: acc.lastUsed,
            enabled: acc.enabled,
          })
        }
      }

      if (accountsToCheck.length === 0) {
        return
      }

      log.debug(`Processing quota refresh queue for ${accountsToCheck.length} accounts`)
      const results = await checkAccountsQuota(accountsToCheck, this.client, this.providerId)
      
      const currentManagerAccounts = this.accountManager.getAccounts()
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const originalAccount = accountsToCheck[i]
        
        if (result?.status === "ok" && result.quota?.groups && originalAccount) {
          const matched = currentManagerAccounts.find(a => a.parts.refreshToken === originalAccount.refreshToken)
          if (matched) {
            this.accountManager.updateQuotaCache(matched.index, result.quota.groups)
            this.lastRefreshed.set(matched.index, Date.now())
          }
        }
      }
      
      this.accountManager.requestSaveToDisk()
    } catch (err) {
      log.error("Failed to process quota refresh queue", { error: String(err) })
    } finally {
      this.isProcessingQueue = false
      
      // If new items were added during processing, run again
      if (this.refreshQueue.size > 0) {
        void this.processQueue()
      }
    }
  }
}
