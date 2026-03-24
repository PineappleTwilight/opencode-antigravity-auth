import { select } from './select.ts'
import { ANSI } from './ansi.ts'

export async function confirm(message: string, defaultYes = false): Promise<boolean> {
  const warningMessage = `${ANSI.brightYellow}${ANSI.bold}? ${ANSI.reset}${message}`
  const items = defaultYes
    ? [
        { label: `${ANSI.green}✓${ANSI.reset} Yes`, value: true },
        { label: `${ANSI.red}✕${ANSI.reset} No`, value: false },
      ]
    : [
        { label: `${ANSI.red}✕${ANSI.reset} No`, value: false },
        { label: `${ANSI.green}✓${ANSI.reset} Yes`, value: true },
      ]

  const result = await select(items, { message: warningMessage })
  return result ?? false
}
