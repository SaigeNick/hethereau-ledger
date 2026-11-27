import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'

export type ResultLine = { ok: boolean; text: string; added?: number }

/** A clear "it worked" panel after an import, scrolled into view. */
export function ImportResults({ lines }: { lines: ResultLine[] }) {
  const { t } = useI18n()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (lines.length) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [lines])
  if (!lines.length) return null
  const ok = lines.some((l) => l.ok)
  const added = lines.reduce((a, l) => a + (l.added ?? 0), 0)
  return (
    <div ref={ref} className={'import-done' + (ok ? '' : ' is-bad')} role="status" aria-live="polite">
      {ok && (
        <p className="import-done-head">
          <span aria-hidden="true">✓</span> {added > 0 ? t('import.doneAdded', { n: added }) : t('import.doneNothingNew')}
        </p>
      )}
      <ul className="results">
        {lines.map((l, i) => (
          <li key={i} className={l.ok ? 'ok' : 'bad'}>
            {l.text}
          </li>
        ))}
      </ul>
      {ok && (
        <Link className="btn" to="/">
          {t('import.openOverview')}
        </Link>
      )}
    </div>
  )
}
