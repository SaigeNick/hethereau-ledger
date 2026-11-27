import { NavLink, Outlet } from 'react-router-dom'
import { KOFI_URL } from '../config'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'

export function Layout() {
  const { t, lang, setLang } = useI18n()
  const { saveFailed } = useStore()
  return (
    <div className="app">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <NavLink to="/" className="wordmark" aria-label="Hethereau Ledger">
          <span className="wm-a">Hethereau</span>
          <span className="wm-b">Ledger</span>
        </NavLink>
        <nav aria-label="Main">
          <NavLink to="/" end>
            {t('nav.overview')}
          </NavLink>
          <NavLink to="/import">{t('nav.import')}</NavLink>
          <NavLink to="/guide">{t('nav.guide')}</NavLink>
          <NavLink to="/profile">{t('nav.profile')}</NavLink>
        </nav>
        <button className="lang" onClick={() => setLang(lang === 'uk' ? 'en' : 'uk')} lang={lang === 'uk' ? 'en' : 'uk'}>
          {t('lang.switch')}
        </button>
      </header>
      {saveFailed && <p className="banner-warn">{t('profile.saveFailed')}</p>}
      <main id="main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export function Footer() {
  const { t } = useI18n()
  return (
    <footer className="footer">
      <p>{t('footer.fan')}</p>
      {KOFI_URL ? (
        <a className="kofi" href={KOFI_URL} target="_blank" rel="noreferrer">
          {t('footer.kofi')}
        </a>
      ) : (
        <span className="kofi is-soon" title={t('footer.kofiSoon')}>
          {t('footer.kofi')}
        </span>
      )}
    </footer>
  )
}
