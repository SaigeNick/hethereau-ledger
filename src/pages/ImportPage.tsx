import { useRef, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { EXPORTER_RELEASES, NPCAP_URL } from '../config'
import { useI18n } from '../lib/i18n'
import { ImportError, parseExport } from '../lib/importer'
import { newId, useStore } from '../lib/store'
import { POOL_IDS, type PoolId, type PullRecord } from '../lib/types'
import { loadDemo } from './OverviewPage'
import { SyncImport } from '../components/SyncImport'

type Line = { ok: boolean; text: string }

export function ImportPage() {
  const { t } = useI18n()
  const store = useStore()
  const { importParsed } = store
  const [lines, setLines] = useState<Line[]>([])
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function handle(files: FileList | File[]) {
    const out: Line[] = []
    for (const file of Array.from(files)) {
      try {
        const parsed = parseExport(await file.text())
        const res = importParsed(parsed)
        out.push({ ok: true, text: t('import.result', { pool: t(`pool.${res.pool}` as never), added: res.added, dup: res.duplicates }) })
        if (res.createdProfile) out.push({ ok: true, text: t('import.newProfile') })
      } catch (e) {
        const code = e instanceof ImportError ? e.code : 'wrong_format'
        out.push({ ok: false, text: t(`import.err.${code}` as never, { file: file.name }) })
      }
    }
    setLines(out)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setOver(false)
    if (e.dataTransfer.files.length) handle(e.dataTransfer.files)
  }

  return (
    <div className="import">
      <h1>{t('import.title')}</h1>
      <SyncImport />

      <h2 className="spaced">{t('import.exporterTitle')}</h2>
      <p>{t('import.lead')}</p>

      <ol className="steps">
        <li>
          {t('import.step1')}{' '}
          <a href={EXPORTER_RELEASES} target="_blank" rel="noreferrer">
            {t('import.releases')}
          </a>
        </li>
        <li>
          {t('import.step2')}{' '}
          <a href={NPCAP_URL} target="_blank" rel="noreferrer">
            npcap.com
          </a>
        </li>
        <li>{t('import.step3')}</li>
        <li>{t('import.step4')}</li>
        <li>{t('import.step5')}</li>
      </ol>
      <p className="note muted">{t('import.risk')}</p>

      <button
        type="button"
        className={'dropzone' + (over ? ' is-over' : '')}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        {over ? t('import.dropActive') : t('import.drop')}
      </button>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) handle(e.target.files)
          e.target.value = ''
        }}
      />
      <p className="note muted">{t('import.reimport')}</p>

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

      <p>
        <button className="btn btn--ghost" onClick={() => loadDemo(store)}>
          {t('import.demo')}
        </button>
      </p>
      <p className="note muted">{t('import.demoNote')}</p>

      <ManualForm />
    </div>
  )
}

function ManualForm() {
  const { t } = useI18n()
  const { addManual } = useStore()
  const [pool, setPool] = useState<PoolId>('Lottery_LimitedCharacter')
  const [count, setCount] = useState(10)
  const [gotTop, setGotTop] = useState(false)
  const [name, setName] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [done, setDone] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = Math.max(1, Math.min(500, Math.floor(count)))
    const now = new Date()
    const time = `${date} ${now.toTimeString().slice(0, 8)}`
    const batch = newId(6)
    const topType = pool === 'Arc_MiracleBox' ? 'arc' : pool === 'Gashapon_MysteryBox' ? 'item' : 'character'
    const rows: PullRecord[] = []
    for (let ord = 0; ord < n; ord++) {
      const isTop = gotTop && ord === 0
      rows.push({
        uid: `manual-${batch}-${ord}`,
        pool,
        time,
        ord,
        kind: 'manual',
        rewardType: isTop ? topType : 'unknown',
        rewardId: isTop ? name.trim().toLowerCase().replace(/\s+/g, '_') : '',
        name: isTop ? name.trim() || 'S' : t('manual.unknown'),
        rank: isTop ? 'S' : '?',
        manual: true,
      })
    }
    addManual(pool, rows)
    setDone(t('manual.added', { n }))
    setName('')
    setGotTop(false)
  }

  return (
    <section className="manual">
      <h2>{t('manual.title')}</h2>
      <p className="muted">{t('manual.lead')}</p>
      <form onSubmit={submit} className="form">
        <label>
          <span>{t('manual.pool')}</span>
          <select value={pool} onChange={(e) => setPool(e.target.value as PoolId)}>
            {POOL_IDS.map((p) => (
              <option key={p} value={p}>
                {t(`pool.${p}` as never)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('manual.count')}</span>
          <input type="number" min={1} max={500} value={count} onChange={(e) => setCount(Number(e.target.value))} required />
        </label>
        <label>
          <span>{t('manual.date')}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="check">
          <input type="checkbox" checked={gotTop} onChange={(e) => setGotTop(e.target.checked)} />
          <span>{t('manual.gotTop')}</span>
        </label>
        {gotTop && (
          <label>
            <span>{t('manual.name')}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('manual.namePh')} required />
          </label>
        )}
        <button className="btn" type="submit">
          {t('manual.add')}
        </button>
        {done && (
          <p className="ok" aria-live="polite">
            {done}
          </p>
        )}
      </form>
    </section>
  )
}
