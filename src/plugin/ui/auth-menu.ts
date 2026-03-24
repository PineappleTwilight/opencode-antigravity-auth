import { ANSI } from './ansi.ts'
import { select, type MenuItem } from './select.ts'
import { confirm } from './confirm.ts'

export type AccountStatus = 'active' | 'rate-limited' | 'expired' | 'verification-required' | 'unknown'

export interface AccountInfo {
  email?: string
  index: number
  addedAt?: number
  lastUsed?: number
  status?: AccountStatus
  isCurrentAccount?: boolean
  enabled?: boolean
}

export type AuthMenuAction =
  | { type: 'add' }
  | { type: 'select-account'; account: AccountInfo }
  | { type: 'delete-all' }
  | { type: 'check' }
  | { type: 'verify' }
  | { type: 'verify-all' }
  | { type: 'configure-models' }
  | { type: 'cancel' }

export type AccountAction = 'back' | 'delete' | 'refresh' | 'toggle' | 'verify' | 'cancel'

function formatRelativeTime(timestamp: number | undefined): string {
  if (!timestamp) return 'never'
  const days = Math.floor((Date.now() - timestamp) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return new Date(timestamp).toLocaleDateString()
}

function formatDate(timestamp: number | undefined): string {
  if (!timestamp) return 'unknown'
  return new Date(timestamp).toLocaleDateString()
}

function getStatusBadge(status: AccountStatus | undefined): string {
  switch (status) {
    case 'active': return `${ANSI.bgGreen}${ANSI.brightWhite}${ANSI.bold} ✓ active ${ANSI.reset}`
    case 'rate-limited': return `${ANSI.bgYellow}${ANSI.brightWhite}${ANSI.bold} ⏳ limited ${ANSI.reset}`
    case 'expired': return `${ANSI.bgRed}${ANSI.brightWhite}${ANSI.bold} ✕ expired ${ANSI.reset}`
    case 'verification-required': return `${ANSI.bgRed}${ANSI.brightWhite}${ANSI.bold} ⚠ verify ${ANSI.reset}`
    default: return ''
  }
}

export async function showAuthMenu(accounts: AccountInfo[]): Promise<AuthMenuAction> {
  const accountCount = accounts.length
  const activeCount = accounts.filter(a => a.status === 'active').length
  const subtitleText = accountCount > 0
    ? `${accountCount} account${accountCount > 1 ? 's' : ''} · ${activeCount} active`
    : 'No accounts configured yet'

  const items: MenuItem<AuthMenuAction>[] = [
    { label: 'Quick Actions', value: { type: 'cancel' }, kind: 'heading' },
    { label: '+  Add account', value: { type: 'add' }, color: 'green' },
    { label: '  Check quotas', value: { type: 'check' }, color: 'cyan' },
    { label: '  Verify one account', value: { type: 'verify' }, color: 'cyan' },
    { label: '  Verify all accounts', value: { type: 'verify-all' }, color: 'cyan' },
    { label: '  Configure models', value: { type: 'configure-models' }, color: 'cyan' },

    { label: '', value: { type: 'cancel' }, separator: true },

    { label: 'Your Accounts', value: { type: 'cancel' }, kind: 'heading' },

    ...accounts.map(account => {
      const statusBadge = getStatusBadge(account.status)
      const currentBadge = account.isCurrentAccount ? ` ${ANSI.brightCyan}${ANSI.bold}★${ANSI.reset}` : ''
      const disabledBadge = account.enabled === false ? ` ${ANSI.dim}${ANSI.strikethrough}(disabled)${ANSI.reset}` : ''
      const baseLabel = account.email || `Account ${account.index + 1}`
      const numbered = `${ANSI.dim}${String(account.index + 1).padStart(2)}${ANSI.reset} ${baseLabel}`
      const fullLabel = `${numbered}${currentBadge} ${statusBadge}${disabledBadge}`

      return {
        label: fullLabel,
        hint: account.lastUsed ? `used ${formatRelativeTime(account.lastUsed)}` : '',
        value: { type: 'select-account' as const, account },
      }
    }),

    { label: '', value: { type: 'cancel' }, separator: true },

    { label: 'Danger Zone', value: { type: 'cancel' }, kind: 'heading' },
    { label: '  Delete all accounts', value: { type: 'delete-all' }, color: 'red' as const },
  ]

  while (true) {
    const result = await select(items, {
      message: 'Google Accounts · Antigravity',
      subtitle: subtitleText,
      clearScreen: true,
    })

    if (!result) return { type: 'cancel' }

    if (result.type === 'delete-all') {
      const confirmed = await confirm('Delete ALL accounts? This cannot be undone.')
      if (!confirmed) continue
    }

    return result
  }
}

export async function showAccountDetails(account: AccountInfo): Promise<AccountAction> {
  const label = account.email || `Account ${account.index + 1}`
  const badge = getStatusBadge(account.status)
  const disabledBadge = account.enabled === false ? ` ${ANSI.dim}${ANSI.strikethrough}(disabled)${ANSI.reset}` : ''
  const header = `${ANSI.bold}${label}${ANSI.reset} ${badge}${disabledBadge}`
  const subtitleParts = [
    `${ANSI.dim}Added: ${formatDate(account.addedAt)}${ANSI.reset}`,
    `${ANSI.dim}Last used: ${formatRelativeTime(account.lastUsed)}${ANSI.reset}`,
  ]

  while (true) {
    const result = await select([
      { label: '←  Back', value: 'back' as const },
      { label: '  Verify account access', value: 'verify' as const, color: 'cyan' },
      { label: account.enabled === false ? '  Enable account' : '  Disable account', value: 'toggle' as const, color: account.enabled === false ? 'green' : 'yellow' },
      { label: '  Refresh token', value: 'refresh' as const, color: 'cyan' },
      { label: '  Delete this account', value: 'delete' as const, color: 'red' },
    ], {
      message: header,
      subtitle: subtitleParts.join('  ·  '),
      clearScreen: true,
    })

    if (result === 'delete') {
      const confirmed = await confirm(`Delete ${label}?`)
      if (!confirmed) continue
    }

    if (result === 'refresh') {
      const confirmed = await confirm(`Re-authenticate ${label}?`)
      if (!confirmed) continue
    }

    return result ?? 'cancel'
  }
}

export { isTTY } from './ansi.ts'
