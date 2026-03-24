import { createInterface } from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import {
  showAuthMenu,
  showAccountDetails,
  isTTY,
  type AccountInfo,
  type AccountStatus,
} from "./ui/auth-menu.ts"
import { updateOpencodeConfig } from "./config/updater.ts"

export async function promptAddAnotherAccount(currentCount: number): Promise<boolean> {
  const rl = createInterface({ input, output })
  try {
    const answer = await rl.question(`${BRIGHT_CYAN}?${RESET} Add another account? (${currentCount} added) ${DIM}(y/n)${RESET} `)
    const normalized = answer.trim().toLowerCase()
    return normalized === "y" || normalized === "yes"
  } finally {
    rl.close()
  }
}

export type LoginMode = "add" | "fresh" | "manage" | "check" | "verify" | "verify-all" | "cancel"

export interface ExistingAccountInfo {
  email?: string
  index: number
  addedAt?: number
  lastUsed?: number
  status?: AccountStatus
  isCurrentAccount?: boolean
  enabled?: boolean
}

export interface LoginMenuResult {
  mode: LoginMode
  deleteAccountIndex?: number
  refreshAccountIndex?: number
  toggleAccountIndex?: number
  verifyAccountIndex?: number
  verifyAll?: boolean
  deleteAll?: boolean
}

const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const CYAN = '\x1b[36m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'
const BRIGHT_CYAN = '\x1b[96m'
const BRIGHT_WHITE = '\x1b[97m'
const GRAY = '\x1b[90m'

async function promptLoginModeFallback(existingAccounts: ExistingAccountInfo[]): Promise<LoginMenuResult> {
  const rl = createInterface({ input, output })
  try {
    console.log(`\n${BRIGHT_CYAN}╭─────────────────────────────────╮${RESET}`)
    console.log(`${BRIGHT_CYAN}│${RESET} ${BOLD}${BRIGHT_WHITE}Google Accounts · Antigravity${RESET} ${BRIGHT_CYAN}│${RESET}`)
    console.log(`${BRIGHT_CYAN}╰─────────────────────────────────╯${RESET}`)
    console.log(`${DIM}  ${existingAccounts.length} account(s) saved${RESET}\n`)

    for (const acc of existingAccounts) {
      const label = acc.email || `Account ${acc.index + 1}`
      const statusIcon = acc.status === 'active' ? `${GREEN}✓${RESET}` :
                         acc.status === 'rate-limited' ? `${YELLOW}⏳${RESET}` :
                         acc.status === 'expired' ? `\x1b[31m✕${RESET}` :
                         acc.status === 'verification-required' ? `\x1b[31m⚠${RESET}` : `${DIM}?${RESET}`
      const current = acc.isCurrentAccount ? ` ${BRIGHT_CYAN}★${RESET}` : ''
      console.log(`  ${GRAY}${String(acc.index + 1).padStart(2)}${RESET} ${statusIcon} ${label}${current}`)
    }
    console.log("")
    console.log(`${GRAY}  ${'─'.repeat(34)}${RESET}`)
    console.log(`  ${CYAN}a${RESET}  Add new account`)
    console.log(`  ${CYAN}f${RESET}  Fresh start (clear all)`)
    console.log(`  ${CYAN}c${RESET}  Check quotas`)
    console.log(`  ${CYAN}v${RESET}  Verify account`)
    console.log(`  ${CYAN}va${RESET} Verify all accounts`)
    console.log(`${GRAY}  ${'─'.repeat(34)}${RESET}`)

    while (true) {
      const answer = await rl.question(`  ${BRIGHT_CYAN}▸${RESET} `)
      const normalized = answer.trim().toLowerCase()

      if (normalized === "a" || normalized === "add") {
        return { mode: "add" }
      }
      if (normalized === "f" || normalized === "fresh") {
        return { mode: "fresh" }
      }
      if (normalized === "c" || normalized === "check") {
        return { mode: "check" }
      }
      if (normalized === "v" || normalized === "verify") {
        return { mode: "verify" }
      }
      if (normalized === "va" || normalized === "verify-all" || normalized === "all") {
        return { mode: "verify-all", verifyAll: true }
      }

      console.log(`  ${YELLOW}Please enter a, f, c, v, or va${RESET}`)
    }
  } finally {
    rl.close()
  }
}

export async function promptLoginMode(existingAccounts: ExistingAccountInfo[]): Promise<LoginMenuResult> {
  if (!isTTY()) {
    return promptLoginModeFallback(existingAccounts)
  }

  const accounts: AccountInfo[] = existingAccounts.map(acc => ({
    email: acc.email,
    index: acc.index,
    addedAt: acc.addedAt,
    lastUsed: acc.lastUsed,
    status: acc.status,
    isCurrentAccount: acc.isCurrentAccount,
    enabled: acc.enabled,
  }))

  console.log("")

  while (true) {
    const action = await showAuthMenu(accounts)

    switch (action.type) {
      case "add":
        return { mode: "add" }

      case "check":
        return { mode: "check" }

      case "verify":
        return { mode: "verify" }

      case "verify-all":
        return { mode: "verify-all", verifyAll: true }

      case "select-account": {
        const accountAction = await showAccountDetails(action.account)
        if (accountAction === "delete") {
          return { mode: "add", deleteAccountIndex: action.account.index }
        }
        if (accountAction === "refresh") {
          return { mode: "add", refreshAccountIndex: action.account.index }
        }
        if (accountAction === "toggle") {
          return { mode: "manage", toggleAccountIndex: action.account.index }
        }
        if (accountAction === "verify") {
          return { mode: "verify", verifyAccountIndex: action.account.index }
        }
        continue
      }

      case "delete-all":
        return { mode: "fresh", deleteAll: true }

      case "configure-models": {
        const result = await updateOpencodeConfig()
        if (result.success) {
          console.log(`\n${GREEN}✓${RESET} Models configured in ${result.configPath}\n`)
        } else {
          console.log(`\n\x1b[31m✕${RESET} Failed to configure models: ${result.error}\n`)
        }
        continue
      }

      case "cancel":
        return { mode: "cancel" }
    }
  }
}

export { isTTY } from "./ui/auth-menu.ts"
export type { AccountStatus } from "./ui/auth-menu.ts"
