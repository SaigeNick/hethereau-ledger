import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { avatarOf, characterCopies, quickStats } from '../lib/profileInfo'
import { normalizeRegion, REGION_NAMES, REGIONS } from '../lib/regions'
import { useStore } from '../lib/store'
import type { Profile } from '../lib/types'
import { pluralUk } from '../lib/plural'
import { Portrait } from './Portrait'

const TEXT = {
  uk: {
    change: 'Змінити',
    changeAvatar: 'Змінити аватар',
    pickTitle: 'Аватар профілю',
    pickLead: 'Виберіть персонажа. Ті, що у вас є, — першими.',
    auto: 'Авто',
    autoHint: 'останній S-персонаж з лімітованих банерів',
    done: 'Готово',
    name: 'Назва профілю',
    namePh: 'Наприклад, нікнейм у грі',
    region: 'Регіон',
    regionUnknown: 'Не вибрано',
    uidHint: 'UID видно лише вам, у посилання «поділитися» він не потрапляє.',
    pulls: 'Круток',
    s: 'S-класу',
    chars: 'Персонажів',
    ach: 'Досягнень',
    accounts: 'Акаунти',
    accountsLead: 'Кожен акаунт гри — окремий профіль зі своїми крутками, досягненнями й колекцією. Перемикатися можна тут або кнопкою з ім’ям угорі.',
    add: 'Додати акаунт',
    addHint: 'Новий профіль для іншого акаунта гри',
    unnamed: 'Без назви',
    pullsOf: (n: number, f: string) => pluralUk(n, 'крутка', 'крутки', 'круток').replace(String(n), f),
  },
  en: {
    change: 'Change',
    changeAvatar: 'Change profile picture',
    pickTitle: 'Profile picture',
    pickLead: 'Pick a character. The ones you own come first.',
    auto: 'Auto',
    autoHint: 'your newest S-Class character from limited banners',
    done: 'Done',
    name: 'Profile name',
    namePh: 'For example, your in-game name',
    region: 'Region',
    regionUnknown: 'Not set',
    uidHint: 'Only you see the UID; share links never include it.',
    pulls: 'Pulls',
    s: 'S-Class',
    chars: 'Characters',
    ach: 'Achievements',
    accounts: 'Accounts',
    accountsLead: 'Each game account is a separate profile with its own pulls, achievements and collection. Switch here or with the name button at the top.',
    add: 'Add account',
    addHint: 'A new profile for another game account',
    unnamed: 'Unnamed',
    pullsOf: (n: number, f: string) => `${f} pull${n === 1 ? '' : 's'}`,
  },
}

/** Profile picture: the chosen or automatic character, or the first letter of the name. */
export function ProfileAvatar({ profile, size = 40 }: { profile: Profile; size?: number }) {
  const a = avatarOf(profile)
  if (a) return <Portrait id={a.id} name={a.name} rank={a.rank} size={size} />
  const letter = (profile.name.trim()[0] ?? '?').toUpperCase()
  return (
    <span className="avatar-empty" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {letter}
    </span>
  )
}

export function ProfileHeader() {
  const { lang, fmtNum } = useI18n()
  const x = TEXT[lang]
  const store = useStore()
  const { active } = store
  const [picking, setPicking] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const stats = useMemo(() => quickStats(active), [active])
  const chars = useMemo(() => characterCopies(active), [active])
  const owned = chars.filter((c) => c.total > 0).length
  const region = normalizeRegion(active.region)
  const picks = useMemo(() => [...chars].sort((a, b) => Number(b.total > 0) - Number(a.total > 0)), [chars])

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (picking && !d.open) d.showModal?.()
    if (!picking && d.open) d.close()
  }, [picking])

  return (
    <section className="profile-head">
      <button type="button" className="avatar-btn" onClick={() => setPicking(true)} aria-label={x.changeAvatar}>
        <ProfileAvatar profile={active} size={96} />
        <span className="avatar-edit">{x.change}</span>
      </button>
      <div className="profile-head-body">
        <input
          className="profile-name"
          aria-label={x.name}
          value={active.name}
          placeholder={x.namePh}
          maxLength={40}
          onChange={(e) => store.updateProfile(active.id, { name: e.target.value })}
        />
        <div className="profile-meta">
          <label className="region-pick">
            <span className="muted">{x.region}</span>
            <select value={region ?? ''} onChange={(e) => store.updateProfile(active.id, { region: e.target.value || undefined })}>
              <option value="">{x.regionUnknown}</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {REGION_NAMES[lang][r]}
                </option>
              ))}
            </select>
          </label>
          {active.gameUid && active.gameUid !== 'demo' && (
            <span className="muted" title={x.uidHint}>
              UID <span className="mono">{active.gameUid}</span>
            </span>
          )}
        </div>
        <dl className="profile-stats">
          <div>
            <dt>{x.pulls}</dt>
            <dd>{fmtNum(stats.pulls)}</dd>
          </div>
          <div>
            <dt>{x.s}</dt>
            <dd>{stats.s}</dd>
          </div>
          <div>
            <dt>{x.chars}</dt>
            <dd>
              {owned}/{chars.length}
            </dd>
          </div>
          <div>
            <dt>{x.ach}</dt>
            <dd>{active.achievements?.length ?? 0}</dd>
          </div>
        </dl>
      </div>

      <dialog ref={dialog} className="modal" aria-labelledby="avatar-title" onClose={() => setPicking(false)} onClick={(e) => e.target === e.currentTarget && setPicking(false)}>
        {picking && (
          <div className="modal-body">
            <h2 id="avatar-title">{x.pickTitle}</h2>
            <p className="muted small">{x.pickLead}</p>
            <div className="avatar-grid" role="radiogroup" aria-label={x.pickTitle}>
              <button type="button" role="radio" aria-checked={!active.avatar} className={'avatar-opt avatar-opt--auto' + (!active.avatar ? ' is-on' : '')} onClick={() => store.updateProfile(active.id, { avatar: undefined })} title={x.autoHint}>
                <ProfileAvatar profile={{ ...active, avatar: undefined }} size={52} />
                <span>{x.auto}</span>
              </button>
              {picks.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={active.avatar === c.id}
                  className={'avatar-opt' + (active.avatar === c.id ? ' is-on' : '') + (c.total > 0 ? '' : ' is-missing')}
                  onClick={() => store.updateProfile(active.id, { avatar: c.id })}
                >
                  <Portrait id={c.id} name={c.name} rank={c.rank} size={52} />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setPicking(false)}>
                {x.done}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  )
}

export function AccountCards() {
  const { lang, fmtNum } = useI18n()
  const x = TEXT[lang]
  const store = useStore()
  const navigate = useNavigate()
  const { state, active } = store
  const totals = useMemo(() => new Map(state.profiles.map((p) => [p.id, quickStats(p).pulls])), [state.profiles])

  return (
    <section className="accounts">
      <h2>{x.accounts}</h2>
      <p className="muted">{x.accountsLead}</p>
      <div className="account-grid">
        {state.profiles.map((p) => {
          const isOpen = p.id === active.id
          const region = normalizeRegion(p.region)
          return (
            <button key={p.id} type="button" className={'account' + (isOpen ? ' is-on' : '')} aria-current={isOpen} onClick={() => store.switchProfile(p.id)}>
              <ProfileAvatar profile={p} size={44} />
              <span className="account-text">
                <span className="account-name">{p.name || x.unnamed}</span>
                <span className="muted small">
                  {[region && REGION_NAMES[lang][region], x.pullsOf(totals.get(p.id) ?? 0, fmtNum(totals.get(p.id) ?? 0))].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
          )
        })}
        <button
          type="button"
          className="account account--add"
          onClick={() => {
            store.addProfile('')
            navigate('/import')
          }}
        >
          <span className="account-plus" aria-hidden="true">
            +
          </span>
          <span className="account-text">
            <span className="account-name">{x.add}</span>
            <span className="muted small">{x.addHint}</span>
          </span>
        </button>
      </div>
    </section>
  )
}
