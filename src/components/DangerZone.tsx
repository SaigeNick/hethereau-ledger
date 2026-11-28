import { useEffect, useRef, useState } from 'react'
import { driveFlag } from '../lib/drive'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'
import { POOL_IDS, type PoolId } from '../lib/types'
import { forgetProfileOnline, wipeEverything } from '../lib/wipe'

const TEXT = {
  uk: {
    title: 'Небезпечна зона',
    lead: 'Ці дії не можна скасувати. Якщо сумніваєтеся, спершу збережіть резервну копію вище.',
    poolTitle: 'Очистити історію одного банера',
    poolLead: (name: string) => `Видаляє крутки вибраного банера в профілі «${name}». Інші банери, досягнення й колекція лишаються.`,
    poolBtn: 'Очистити',
    profileTitle: (name: string) => `Видалити профіль «${name}»`,
    profileLead: 'Усі крутки, досягнення й колекція цього профілю. Його посилання «поділитися» перестане працювати, а анонімна статистика видалиться.',
    profileBtn: 'Видалити профіль',
    allTitle: 'Видалити всі дані',
    allLead: (drive: boolean) =>
      `Усі профілі на цьому пристрої, ваші посилання «поділитися», анонімна статистика й налаштування${drive ? ', а також копія на Google Drive' : ''}. Сайт стане таким, ніби ви відкрили його вперше.`,
    allBtn: 'Видалити все',
    sure: 'Точно видалити?',
    cancel: 'Скасувати',
    confirm: 'Видалити назавжди',
    typeHint: (w: string) => `Щоб підтвердити, введіть ${w}`,
    word: 'ВИДАЛИТИ',
    working: 'Видаляємо…',
    driveFailed: 'Дані на пристрої видалено, але копію на Google Drive прибрати не вдалося. Її можна видалити в налаштуваннях Google: Диск → Налаштування → Керування додатками.',
    unnamed: 'без назви',
  },
  en: {
    title: 'Danger zone',
    lead: 'These actions can’t be undone. If in doubt, save a backup above first.',
    poolTitle: 'Clear one banner’s history',
    poolLead: (name: string) => `Deletes the pulls of the chosen banner in the “${name}” profile. Other banners, achievements and the collection stay.`,
    poolBtn: 'Clear',
    profileTitle: (name: string) => `Delete the “${name}” profile`,
    profileLead: 'All pulls, achievements and collection of this profile. Its share link stops working and its anonymous stats are deleted.',
    profileBtn: 'Delete profile',
    allTitle: 'Delete all data',
    allLead: (drive: boolean) =>
      `Every profile on this device, your share links, anonymous stats and settings${drive ? ', plus the Google Drive copy' : ''}. The site will be as if you opened it for the first time.`,
    allBtn: 'Delete everything',
    sure: 'Delete for good?',
    cancel: 'Cancel',
    confirm: 'Delete for good',
    typeHint: (w: string) => `To confirm, type ${w}`,
    word: 'DELETE',
    working: 'Deleting…',
    driveFailed: 'Data on this device is deleted, but the Google Drive copy could not be removed. You can remove it in Google Drive: Settings → Manage apps.',
    unnamed: 'unnamed',
  },
}

type Action = { kind: 'pool'; pool: PoolId } | { kind: 'profile' } | { kind: 'all' }

export function DangerZone() {
  const { t, lang } = useI18n()
  const x = TEXT[lang]
  const store = useStore()
  const { active, state } = store
  const name = active.name || x.unnamed
  const pools = POOL_IDS.filter((p) => active.records[p].length > 0)
  const [pool, setPool] = useState<PoolId | ''>('')
  const [action, setAction] = useState<Action | null>(null)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const drive = driveFlag().on
  const chosen = pool && pools.includes(pool) ? pool : pools[0]

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (action && !d.open) d.showModal?.()
    if (!action && d.open) d.close()
    setTyped('')
  }, [action])

  const needsWord = action?.kind === 'all'
  const ready = !busy && (!needsWord || typed.trim().toUpperCase() === x.word)

  async function confirm() {
    if (!action) return
    setBusy(true)
    try {
      if (action.kind === 'pool') {
        store.clearPool(action.pool)
        setAction(null)
      } else if (action.kind === 'profile') {
        await forgetProfileOnline(active)
        store.deleteProfile(active.id)
        setAction(null)
      } else {
        const { driveFailed } = await wipeEverything(state)
        if (driveFailed) {
          setNote(x.driveFailed)
          setAction(null)
          setTimeout(() => location.replace(location.pathname), 6000)
        } else location.replace(location.pathname)
      }
    } finally {
      setBusy(false)
    }
  }

  const title =
    action?.kind === 'pool' ? `${x.poolTitle}: ${t(`pool.${action.pool}` as never)}` : action?.kind === 'profile' ? x.profileTitle(name) : action?.kind === 'all' ? x.allTitle : ''
  const lead = action?.kind === 'pool' ? x.poolLead(name) : action?.kind === 'profile' ? x.profileLead : action?.kind === 'all' ? x.allLead(drive) : ''

  return (
    <section className="danger-zone" aria-labelledby="danger-title">
      <h2 id="danger-title">{x.title}</h2>
      <p className="muted">{x.lead}</p>

      {pools.length > 0 && (
        <div className="danger-row">
          <div>
            <h3>{x.poolTitle}</h3>
            <p className="muted small">{x.poolLead(name)}</p>
          </div>
          <div className="danger-controls">
            <select value={chosen} onChange={(e) => setPool(e.target.value as PoolId)} aria-label={x.poolTitle}>
              {pools.map((p) => (
                <option key={p} value={p}>
                  {t(`pool.${p}` as never)}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn--danger-outline" onClick={() => chosen && setAction({ kind: 'pool', pool: chosen })}>
              {x.poolBtn}
            </button>
          </div>
        </div>
      )}

      <div className="danger-row">
        <div>
          <h3>{x.profileTitle(name)}</h3>
          <p className="muted small">{x.profileLead}</p>
        </div>
        <button type="button" className="btn btn--danger-outline" onClick={() => setAction({ kind: 'profile' })}>
          {x.profileBtn}
        </button>
      </div>

      <div className="danger-row danger-row--all">
        <div>
          <h3>{x.allTitle}</h3>
          <p className="muted small">{x.allLead(drive)}</p>
        </div>
        <button type="button" className="btn btn--danger" onClick={() => setAction({ kind: 'all' })}>
          {x.allBtn}
        </button>
      </div>
      {note && (
        <p className="bad" role="alert">
          {note}
        </p>
      )}

      <dialog ref={dialog} className="modal modal--danger" aria-labelledby="danger-dialog-title" onClose={() => setAction(null)} onClick={(e) => e.target === e.currentTarget && !busy && setAction(null)}>
        {action && (
          <div className="modal-body">
            <h2 id="danger-dialog-title">{x.sure}</h2>
            <p>
              <strong>{title}</strong>
            </p>
            <p className="muted">{lead}</p>
            {needsWord && (
              <label className="danger-type">
                <span className="small">{x.typeHint(x.word)}</span>
                <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} autoFocus />
              </label>
            )}
            <div className="modal-actions">
              <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => setAction(null)}>
                {x.cancel}
              </button>
              <button type="button" className="btn btn--danger" disabled={!ready} onClick={confirm}>
                {busy ? x.working : x.confirm}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  )
}
