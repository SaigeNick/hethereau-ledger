import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { decodePackets, looksLikeSync, unpackSync } from '../lib/nteDecoder'
import { useStore } from '../lib/store'
import { POOL_IDS } from '../lib/types'

type Line = { ok: boolean; text: string }

/** The paimon.moe-style flow: run one command, scroll history, paste here. */
export function SyncImport() {
  const { t } = useI18n()
  const { importParsed } = useStore()
  const [text, setText] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const base = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}`
  const command = `irm ${base}sync.ps1 | iex`

  async function run(value: string) {
    if (!looksLikeSync(value)) {
      setLines([{ ok: false, text: t('sync.notCode') }])
      return
    }
    setBusy(true)
    try {
      const recordsByPool = decodePackets(await unpackSync(value))
      const out: Line[] = []
      for (const pool of POOL_IDS) {
        const records = recordsByPool[pool]
        if (!records?.length) continue
        const res = importParsed({ pool, records, warnings: [] })
        out.push({ ok: true, text: t('import.result', { pool: t(`pool.${pool}` as never), added: res.added, dup: res.duplicates }) })
      }
      setLines(out.length ? out : [{ ok: false, text: t('sync.empty') }])
      if (out.length) setText('')
    } catch {
      setLines([{ ok: false, text: t('sync.broken') }])
    } finally {
      setBusy(false)
    }
  }

  // Ctrl+V anywhere on the page works, not only in the box.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const v = e.clipboardData?.getData('text') ?? ''
      if (looksLikeSync(v) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        run(v)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  return (
    <section className="sync">
      <h2>{t('sync.title')}</h2>
      <p className="muted">{t('sync.lead')}</p>
      <ol className="steps">
        <li>{t('sync.step1')}</li>
        <li>
          {t('sync.step2')}
          <div className="cmd">
            <code>{command}</code>
            <button
              className="btn btn--ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(command)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                } catch {
                  /* the command stays selectable */
                }
              }}
            >
              {copied ? t('profile.shareCopied') : t('profile.shareCopy')}
            </button>
          </div>
        </li>
        <li>{t('sync.step3')}</li>
        <li>{t('sync.step4')}</li>
      </ol>
      <label className="paste">
        <span className="muted">{t('sync.pasteLabel')}</span>
        <textarea
          rows={3}
          value={text}
          placeholder="HL1:…"
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const v = e.clipboardData.getData('text')
            if (looksLikeSync(v)) {
              e.preventDefault()
              run(v)
            }
          }}
        />
      </label>
      <div className="actions">
        <button className="btn" disabled={busy || !text.trim()} onClick={() => run(text)}>
          {t('sync.import')}
        </button>
      </div>
      {lines.length > 0 && (
        <ul className="results" aria-live="polite">
          {lines.map((l, i) => (
            <li key={i} className={l.ok ? 'ok' : 'bad'}>
              {l.text}
            </li>
          ))}
          {lines.some((l) => l.ok) && (
            <li>
              <Link to="/">{t('nav.overview')}</Link>
            </li>
          )}
        </ul>
      )}
      <p className="note muted">{t('sync.safety')}</p>
    </section>
  )
}
