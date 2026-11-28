import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Icon, type IconName } from './Icon'
import { ProfileAvatar } from './ProfileHeader'
import { KOFI_URL, REPO_URL } from '../config'
import { useI18n, type TKey } from '../lib/i18n'
import { useAutoShare } from '../lib/autoShare'
import { useDriveAutoSync } from '../lib/driveSync'
import { useStore } from '../lib/store'

type Item = { to: string; label: TKey; icon: IconName; end?: boolean }

/** Everyday sections: the top bar on wide screens, the tab bar on phones. */
const PRIMARY: Item[] = [
  { to: '/', label: 'nav.overview', icon: 'overview', end: true },
  { to: '/banners', label: 'nav.banners', icon: 'banners' },
  { to: '/collection', label: 'nav.collection', icon: 'collection' },
  { to: '/achievements', label: 'nav.achievements', icon: 'achievements' },
  { to: '/planner', label: 'nav.planner', icon: 'planner' },
]
/** On phones the tab bar keeps four sections; the rest live under "More". */
const TABS = PRIMARY.filter((i) => i.to !== '/achievements')
const MORE: Item[] = [
  { to: '/achievements', label: 'nav.achievements', icon: 'achievements' },
  { to: '/import', label: 'nav.import', icon: 'import' },
  { to: '/profile', label: 'nav.profile', icon: 'profile' },
  { to: '/guide', label: 'nav.guide', icon: 'guide' },
  { to: '/faq', label: 'nav.faq', icon: 'faq' },
]

export function Layout() {
  const { t, lang, setLang } = useI18n()
  const store = useStore()
  const { saveFailed, active, state } = store
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menu = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const sheet = useRef<HTMLDialogElement>(null)
  useAutoShare()
  useDriveAutoSync()

  useEffect(() => {
    setMoreOpen(false)
    setMenuOpen(false)
  }, [pathname])
  useEffect(() => {
    if (!menuOpen) return
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menu.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [menuOpen])
  const addAccount = () => {
    store.addProfile('')
    navigate('/import')
  }
  const accountList = (onPick: () => void) =>
    state.profiles.map((p) => (
      <button
        key={p.id}
        type="button"
        role="menuitemradio"
        aria-checked={p.id === active.id}
        className={'account-item' + (p.id === active.id ? ' is-on' : '')}
        onClick={() => {
          store.switchProfile(p.id)
          onPick()
        }}
      >
        <ProfileAvatar profile={p} size={28} />
        <span>{p.name || t('profile.unnamed')}</span>
      </button>
    ))
  useEffect(() => {
    const d = sheet.current
    if (!d) return
    if (moreOpen && !d.open) d.showModal?.()
    if (!moreOpen && d.open) d.close()
  }, [moreOpen])

  const moreActive = MORE.some((i) => pathname.startsWith(i.to)) && !TABS.some((i) => i.to !== '/' && pathname.startsWith(i.to))
  const langBtn = (
    <button className="lang" onClick={() => setLang(lang === 'uk' ? 'en' : 'uk')} lang={lang === 'uk' ? 'en' : 'uk'} aria-label={t('lang.switch')}>
      {lang === 'uk' ? 'EN' : 'UA'}
    </button>
  )

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
        <nav className="nav-main" aria-label="Main">
          {PRIMARY.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end}>
              {t(i.label)}
            </NavLink>
          ))}
        </nav>
        <div className="top-actions">
          <NavLink to="/import" className="top-import">
            <Icon name="import" size={18} />
            <span>{t('nav.import')}</span>
          </NavLink>
          <div className="account-menu" ref={menu}>
            <button type="button" className={'top-profile' + (pathname.startsWith('/profile') ? ' active' : '')} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
              <ProfileAvatar profile={active} size={26} />
              <span>{active.name || t('nav.profile')}</span>
            </button>
            {menuOpen && (
              <div className="account-pop" role="menu">
                <p className="muted small">{t('nav.accounts')}</p>
                {accountList(() => setMenuOpen(false))}
                <hr />
                <NavLink to="/profile" role="menuitem" className="account-item">
                  <Icon name="profile" size={20} />
                  <span>{t('nav.profileSettings')}</span>
                </NavLink>
                <button type="button" role="menuitem" className="account-item" onClick={addAccount}>
                  <span className="account-plus account-plus--sm" aria-hidden="true">
                    +
                  </span>
                  <span>{t('nav.addAccount')}</span>
                </button>
              </div>
            )}
          </div>
          {langBtn}
        </div>
      </header>
      {saveFailed && <p className="banner-warn">{t('profile.saveFailed')}</p>}
      <main id="main">
        <Outlet />
      </main>
      <Footer />

      <nav className="tabbar" aria-label="Main">
        {TABS.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end}>
            <Icon name={i.icon} />
            <span>{t(i.label)}</span>
          </NavLink>
        ))}
        <button type="button" className={moreActive ? 'active' : ''} aria-haspopup="dialog" aria-expanded={moreOpen} onClick={() => setMoreOpen(true)}>
          <Icon name="more" />
          <span>{t('nav.more')}</span>
        </button>
      </nav>
      <dialog ref={sheet} className="sheet" aria-label={t('nav.more')} onClose={() => setMoreOpen(false)} onClick={(e) => e.target === e.currentTarget && setMoreOpen(false)}>
        <div className="sheet-body">
          <div className="sheet-head">
            <strong>{t('nav.more')}</strong>
            <button type="button" className="icon-btn" aria-label={t('common.close')} onClick={() => setMoreOpen(false)}>
              <Icon name="close" size={20} />
            </button>
          </div>
          {state.profiles.length > 1 && (
            <div className="sheet-accounts" role="menu" aria-label={t('nav.accounts')}>
              <p className="muted small">{t('nav.accounts')}</p>
              {accountList(() => setMoreOpen(false))}
            </div>
          )}
          <ul className="sheet-list">
            {MORE.map((i) => (
              <li key={i.to}>
                <NavLink to={i.to}>
                  <Icon name={i.icon} />
                  <span>{t(i.label)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </div>
  )
}

export function Footer() {
  const { t } = useI18n()
  return (
    <footer className="footer">
      <div className="footer-text">
        <p>{t('footer.fan')}</p>
        <p className="footer-links">
          <NavLink to="/guide">{t('nav.guide')}</NavLink>
          <NavLink to="/faq">{t('footer.faq')}</NavLink>
          <NavLink to="/privacy">{t('footer.privacy')}</NavLink>
          <NavLink to="/terms">{t('footer.terms')}</NavLink>
          <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">
            {t('footer.contact')}
          </a>
        </p>
      </div>
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
