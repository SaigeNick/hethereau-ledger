import { useEffect, useState } from 'react'

/**
 * "Install the app". Chrome, Edge and Android hand us a prompt event we keep
 * for the button; iPhone and iPad have no prompt, so we show the Share-menu steps.
 */
interface PromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: PromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((f) => f())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as PromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

export const isStandalone = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true)

export const isIos = () => typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

export function useInstall() {
  const [, bump] = useState(0)
  useEffect(() => {
    const f = () => bump((n) => n + 1)
    listeners.add(f)
    return () => {
      listeners.delete(f)
    }
  }, [])
  return {
    installed: isStandalone(),
    /** The browser can show its own install dialog. */
    canPrompt: !!deferred,
    ios: isIos(),
    async prompt() {
      if (!deferred) return false
      const e = deferred
      deferred = null
      await e.prompt()
      notify()
      return (await e.userChoice).outcome === 'accepted'
    },
  }
}
