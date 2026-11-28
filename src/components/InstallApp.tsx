import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../lib/i18n'
import { useInstall } from '../lib/install'
import { Icon } from './Icon'

const TEXT = {
  uk: {
    install: 'Встановити застосунок',
    title: 'Hethereau як застосунок',
    lead: 'Іконка на головному екрані, відкривається без браузерних панелей і працює без інтернету з уже збереженими крутками.',
    iosSteps: ['Відкрийте сайт у Safari.', 'Натисніть «Поділитися» (квадрат зі стрілкою вгору) внизу екрана.', 'Виберіть «На початковий екран» і натисніть «Додати».'],
    otherSteps: ['Відкрийте меню браузера (⋮ або ⋯).', 'Виберіть «Встановити застосунок» або «Додати на головний екран».'],
    close: 'Зрозуміло',
    banner: 'Додайте Hethereau на головний екран: відкривається як застосунок і працює без інтернету.',
    later: 'Не зараз',
    installShort: 'Встановити',
  },
  en: {
    install: 'Install the app',
    title: 'Hethereau as an app',
    lead: 'An icon on your home screen that opens without browser bars and works offline with the pulls you already saved.',
    iosSteps: ['Open the site in Safari.', 'Tap Share (the square with an up arrow) at the bottom.', 'Choose “Add to Home Screen”, then “Add”.'],
    otherSteps: ['Open the browser menu (⋮ or ⋯).', 'Choose “Install app” or “Add to Home screen”.'],
    close: 'Got it',
    banner: 'Add Hethereau to your home screen: it opens like an app and works offline.',
    later: 'Not now',
    installShort: 'Install',
  },
}

/** Opens the browser's install dialog, or shows how to add the site by hand. */
export function InstallButton({ className = 'btn btn--ghost', children }: { className?: string; children?: React.ReactNode }) {
  const { lang } = useI18n()
  const x = TEXT[lang]
  const app = useInstall()
  const [help, setHelp] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (help && !d.open) d.showModal?.()
    if (!help && d.open) d.close()
  }, [help])
  if (app.installed) return null
  return (
    <>
      <button type="button" className={className} onClick={async () => (app.canPrompt ? app.prompt() : setHelp(true))}>
        {children ?? x.install}
      </button>
      <dialog ref={dialog} className="modal" aria-labelledby="install-title" onClose={() => setHelp(false)} onClick={(e) => e.target === e.currentTarget && setHelp(false)}>
        {help && (
          <div className="modal-body">
            <div className="modal-head">
              <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" width={56} height={56} className="install-icon" />
              <h2 id="install-title">{x.title}</h2>
            </div>
            <p className="muted">{x.lead}</p>
            <ol className="install-steps">
              {(app.ios ? x.iosSteps : x.otherSteps).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setHelp(false)}>
                {x.close}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}

const DISMISSED = 'hethereau-ledger.installHint'

/** A one-time hint on phones that the site can live on the home screen. */
export function InstallHint() {
  const { lang } = useI18n()
  const x = TEXT[lang]
  const app = useInstall()
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED) === '1'
    } catch {
      return true
    }
  })
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 2500)
    return () => clearTimeout(id)
  }, [])
  const phone = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 860px) and (pointer: coarse)').matches
  if (!ready || hidden || app.installed || !phone || !(app.canPrompt || app.ios)) return null
  const dismiss = () => {
    setHidden(true)
    try {
      localStorage.setItem(DISMISSED, '1')
    } catch {
      /* ignore */
    }
  }
  return (
    <aside className="install-hint" role="dialog" aria-label={x.install}>
      <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" width={40} height={40} />
      <p>{x.banner}</p>
      <div className="install-hint-actions">
        <InstallButton className="btn">{x.installShort}</InstallButton>
        <button type="button" className="link-btn" onClick={dismiss}>
          {x.later}
        </button>
      </div>
      <button type="button" className="icon-btn install-close" aria-label={x.later} onClick={dismiss}>
        <Icon name="close" size={18} />
      </button>
    </aside>
  )
}

const SECTION = {
  uk: {
    title: 'Застосунок на телефон',
    lead: 'Встановіть Hethereau як застосунок: іконка на головному екрані, відкривається без панелей браузера і працює без інтернету з уже збереженими крутками.',
    done: 'Ви вже відкрили Hethereau як застосунок.',
  },
  en: {
    title: 'App on your phone',
    lead: 'Install Hethereau as an app: an icon on your home screen that opens without browser bars and works offline with the pulls you already saved.',
    done: 'You’re already using Hethereau as an app.',
  },
}

/** Profile block: install the app, or a note that it already is. */
export function InstallSection() {
  const { lang } = useI18n()
  const x = SECTION[lang]
  const app = useInstall()
  return (
    <section className="install-section">
      <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" width={56} height={56} />
      <div>
        <h2>{x.title}</h2>
        <p className="muted">{app.installed ? x.done : x.lead}</p>
        <InstallButton className="btn" />
      </div>
    </section>
  )
}
