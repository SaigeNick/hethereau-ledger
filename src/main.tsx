import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/tektur/cyrillic-500.css'
import '@fontsource/tektur/latin-500.css'
import '@fontsource/tektur/cyrillic-700.css'
import '@fontsource/tektur/latin-700.css'
import '@fontsource/golos-text/cyrillic-400.css'
import '@fontsource/golos-text/latin-400.css'
import '@fontsource/golos-text/cyrillic-600.css'
import '@fontsource/golos-text/latin-600.css'
import './styles.css'
// Catches the browser's install prompt before React mounts.
import './lib/install'
import { registerSW } from 'virtual:pwa-register'
import App from './App'

// Offline support. When a new version is deployed the service worker takes
// over and the page reloads onto it, so nobody is left on a stale copy.
// Also look for a new version every hour and when the tab comes back.
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return
    const check = () => {
      if (navigator.onLine) reg.update().catch(() => {})
    }
    setInterval(check, 60 * 60 * 1000)
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
