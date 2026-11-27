import { useRef, useState, type DragEvent } from 'react'
import { useI18n } from '../lib/i18n'
import { ImportError, parseExport } from '../lib/importer'
import { newId, useStore } from '../lib/store'
import { POOL_IDS, type PoolId, type PullRecord } from '../lib/types'
import { SyncImport } from '../components/SyncImport'

import { ImportResults, type ResultLine as Line } from '../components/ImportResults'

export function ImportPage() {
  const { t } = useI18n()
  const { importParsed } = useStore()
  const [lines, setLines] = useState<Line[]>([])
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function handle(files: FileList | File[]) {
    const out: Line[] = []
    for (const file of Array.from(files)) {
      try {
        const parsed = parseExport(await file.text())
        const res = importParsed(parsed)
        out.push({ ok: true, added: res.added, text: t('import.result', { pool: t(`pool.${res.pool}` as never), added: res.added, dup: res.duplicates }) })
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
      <p className="muted">{t('import.exporterLead')}</p>

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

      <ImportResults lines={lines} />

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
  const [date, setDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [clock, setClock] = useState(() => new Date().toTimeString().slice(0, 5))
  const [done, setDone] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = Math.max(1, Math.min(500, Math.floor(count)))
    const time = `${date} ${(clock || '12:00').slice(0, 5)}:00`
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
        <div className="form-row">
          <label>
            <span>{t('manual.date')}</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            <span>{t('manual.time')}</span>
            <input type="time" value={clock} onChange={(e) => setClock(e.target.value)} required />
          </label>
        </div>
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
