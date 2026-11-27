import { useRef, useState } from 'react'
import { driveAvailable, removeFile, setDriveFlag, signIn, signOut } from '../lib/drive'
import { _setDriveStatus, useDriveSync } from '../lib/driveSync'
import { useI18n } from '../lib/i18n'
import { shareSig } from '../lib/autoShare'
import { QrCode } from '../components/QrCode'
import { createShare, deleteShare, shareUrl, ShareUnavailable, updateShare } from '../lib/share'
import { isStoreState, useStore } from '../lib/store'
import { POOL_IDS } from '../lib/types'

function ConfirmButton({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const { t } = useI18n()
  const [armed, setArmed] = useState(false)
  return armed ? (
    <span className="confirm">
      {t('profile.confirm')}{' '}
      <button className="btn btn--danger" onClick={() => (setArmed(false), onConfirm())}>
        {label}
      </button>
      <button className="link-btn" onClick={() => setArmed(false)}>
        ✕
      </button>
    </span>
  ) : (
    <button className="btn btn--ghost" onClick={() => setArmed(true)}>
      {label}
    </button>
  )
}

export function ProfilePage() {
  const { t } = useI18n()
  const store = useStore()
  const { active, state } = store
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const restoreInput = useRef<HTMLInputElement>(null)

  async function share(kind: 'create' | 'update' | 'delete') {
    setBusy(true)
    setMsg(null)
    try {
      if (kind === 'create') {
        const res = await createShare(active)
        store.updateProfile(active.id, { share: { ...res, sig: shareSig(active), updatedAt: new Date().toISOString() } })
        setMsg({ ok: true, text: t('profile.shareDone') })
      } else if (kind === 'update' && active.share) {
        await updateShare(active.share.id, active.share.token, active)
        store.updateProfile(active.id, { share: { ...active.share, sig: shareSig(active), updatedAt: new Date().toISOString() } })
        setMsg({ ok: true, text: t('profile.shareDone') })
      } else if (kind === 'delete' && active.share) {
        await deleteShare(active.share.id, active.share.token)
        store.updateProfile(active.id, { share: undefined })
        setMsg({ ok: true, text: t('profile.shareRevoked') })
      }
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ShareUnavailable ? t('profile.shareOffline') : t('profile.shareError') })
    } finally {
      setBusy(false)
    }
  }

  function download() {
    const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `hethereau-ledger-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function restore(file: File) {
    try {
      const data = JSON.parse(await file.text())
      if (!isStoreState(data)) throw new Error()
      store.replaceAll(data)
      setMsg({ ok: true, text: t('profile.restored') })
    } catch {
      setMsg({ ok: false, text: t('profile.restoreBad') })
    }
  }

  const url = active.share ? shareUrl(active.share.id) : null

  return (
    <div className="profile">
      <h1>{t('profile.title')}</h1>

      <section className="form">
        <label>
          <span>{t('profile.name')}</span>
          <input value={active.name} placeholder={t('profile.namePh')} maxLength={40} onChange={(e) => store.updateProfile(active.id, { name: e.target.value })} />
        </label>
        {active.gameUid && active.gameUid !== 'demo' && (
          <p className="muted">
            {t('profile.uid')}: <span className="mono">{active.gameUid}</span>
            {active.region ? ` · ${t('profile.region')}: ${active.region}` : ''}
            <br />
            {t('profile.uidHidden')}
          </p>
        )}
      </section>

      <section>
        <h2>{t('profile.share')}</h2>
        <p className="muted">{t('profile.shareLead')}</p>
        {url && (
          <div className="share-url">
            <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label={t('profile.share')} />
            <button
              className="btn btn--ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                } catch {
                  /* clipboard can be blocked; the field is selectable */
                }
              }}
            >
              {copied ? t('profile.shareCopied') : t('profile.shareCopy')}
            </button>
          </div>
        )}
        {url && (
          <div className="share-qr">
            <QrCode text={url} label={t('profile.qr')} />
            <p className="muted">{t('profile.qrLead')}</p>
          </div>
        )}
        {active.source && !active.share && <p className="muted">{t('profile.isCopy')}</p>}
        <div className="actions">
          {active.share ? (
            <>
              <button className="btn" disabled={busy} onClick={() => share('update')}>
                {t('profile.shareUpdate')}
              </button>
              <button className="btn btn--ghost" disabled={busy} onClick={() => share('delete')}>
                {t('profile.shareRevoke')}
              </button>
            </>
          ) : (
            <button className="btn" disabled={busy} onClick={() => share('create')}>
              {t('profile.shareCreate')}
            </button>
          )}
        </div>
        {msg && (
          <p className={msg.ok ? 'ok' : 'bad'} aria-live="polite">
            {msg.text}
          </p>
        )}
      </section>

      <DriveSection />

      <section>
        <h2>{t('profile.list')}</h2>
        <ul className="profiles">
          {state.profiles.map((p) => (
            <li key={p.id}>
              <span>{p.name || t('profile.unnamed')}</span>
              {p.gameUid && <span className="muted mono">{p.gameUid}</span>}
              {p.id === active.id ? (
                <span className="muted">{t('profile.current')}</span>
              ) : (
                <button className="link-btn" onClick={() => store.switchProfile(p.id)}>
                  {t('profile.switch')}
                </button>
              )}
            </li>
          ))}
        </ul>
        <button className="btn btn--ghost" onClick={() => store.addProfile('')}>
          {t('profile.add')}
        </button>
      </section>

      <section>
        <h2>{t('profile.backup')}</h2>
        <p className="muted">{t('profile.backupLead')}</p>
        <div className="actions">
          <button className="btn btn--ghost" onClick={download}>
            {t('profile.export')}
          </button>
          <button className="btn btn--ghost" onClick={() => restoreInput.current?.click()}>
            {t('profile.restore')}
          </button>
          <input ref={restoreInput} type="file" accept=".json" hidden onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
        </div>
      </section>

      <section>
        <h2>{t('profile.danger')}</h2>
        <div className="actions wrap">
          {POOL_IDS.filter((p) => active.records[p].length > 0).map((p) => (
            <ConfirmButton key={p} label={t('profile.clearPool', { pool: t(`pool.${p}` as never) })} onConfirm={() => store.clearPool(p)} />
          ))}
          <ConfirmButton label={t('profile.delete')} onConfirm={() => store.deleteProfile(active.id)} />
        </div>
      </section>
    </div>
  )
}


function DriveSection() {
  const { t, fmtDate } = useI18n()
  const { status, lastError, flag, syncNow } = useDriveSync()
  const [busy, setBusy] = useState(false)
  if (!driveAvailable()) return null
  const on = status !== 'off'
  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }
  return (
    <section id="drive">
      <h2>{t('drive.title')}</h2>
      <p className="muted">{t('drive.lead')}</p>
      {on && (
        <p className={status === 'error' ? 'bad' : 'muted'} aria-live="polite">
          {status === 'syncing'
            ? t('drive.syncing')
            : status === 'error'
              ? t('drive.error', { code: lastError })
              : status === 'needsSignIn'
                ? t('drive.needsSignIn')
                : flag.lastSync
                  ? t('drive.synced', { date: fmtDate(flag.lastSync) })
                  : ''}
        </p>
      )}
      <div className="actions">
        {!on ? (
          <button className="btn" disabled={busy} onClick={() => run(() => syncNow(true))}>
            {t('drive.connect')}
          </button>
        ) : (
          <>
            <button className="btn" disabled={busy || status === 'syncing'} onClick={() => run(() => syncNow(true))}>
              {t('drive.syncNow')}
            </button>
            <button
              className="btn btn--ghost"
              disabled={busy}
              onClick={() => {
                signOut()
                setDriveFlag({ on: false })
                _setDriveStatus('off')
              }}
            >
              {t('drive.disconnect')}
            </button>
            <ConfirmButton
              label={t('drive.deleteCopy')}
              onConfirm={() =>
                run(async () => {
                  try {
                    await signIn()
                    await removeFile()
                    signOut()
                    setDriveFlag({ on: false })
                    _setDriveStatus('off')
                  } catch (e) {
                    _setDriveStatus('error', e instanceof Error ? e.message : 'error')
                  }
                })
              }
            />
          </>
        )}
      </div>
    </section>
  )
}
