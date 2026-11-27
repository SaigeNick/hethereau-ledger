import { useEffect, useState } from 'react'
import { useI18n } from '../lib/i18n'
import { decodePackets, looksLikeSync, unpackSync } from '../lib/nteDecoder'
import { useStore } from '../lib/store'
import { POOL_IDS } from '../lib/types'

import { ImportResults, type ResultLine as Line } from './ImportResults'

/** One command, scroll the history in the game, paste here. */
export function SyncImport() {
  const { t, fmtDate } = useI18n()
  const { importParsed, active } = useStore()
  const [text, setText] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyBlocked, setCopyBlocked] = useState(false)
  const host = location.host
  // Short on purpose: easy to type when a browser refuses to copy it.
  const command = `irm https://${host}/s | iex`

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
        // If this sync starts after the newest pull already on the site, some
        // history pages in between were not opened.
        const before = active.records[pool]
        const prevNewest = before.reduce((m, r) => (r.time > m ? r.time : m), '')
        const oldestNew = records.reduce((m, r) => (r.time < m ? r.time : m), records[0].time)
        const res = importParsed({ pool, records, warnings: [] })
        out.push({ ok: true, added: res.added, text: t('import.result', { pool: t(`pool.${pool}` as never), added: res.added, dup: res.duplicates }) })
        if (before.length && prevNewest && oldestNew > prevNewest) {
          out.push({ ok: false, text: t('sync.gap', { pool: t(`pool.${pool}` as never), date: fmtDate(prevNewest.replace(' ', 'T')) }) })
        }
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
                  setCopyBlocked(false)
                  setTimeout(() => setCopied(false), 1500)
                } catch {
                  // Browsers that guard against fake "paste this command" pages refuse here.
                  setCopyBlocked(true)
                }
              }}
            >
              {copied ? t('profile.shareCopied') : t('profile.shareCopy')}
            </button>
          </div>
          {copyBlocked && <p className="bad small">{t('sync.copyBlocked')}</p>}
          <p className="muted small">
            {t('sync.altLead')}{' '}
            <a href={`${import.meta.env.BASE_URL}hethereau-sync.cmd`} download>
              {t('sync.altLink')}
            </a>
          </p>
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
      <ImportResults lines={lines} />
      <p className="note muted">{t('sync.safety')}</p>
    </section>
  )
}
