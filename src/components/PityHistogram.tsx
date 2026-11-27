import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import { pityBuckets, type TopDrop } from '../lib/stats'

/** Single series, so no legend: the heading names it. Hover or focus a bar for its value. */
export function PityHistogram({ drops, max, soft }: { drops: TopDrop[]; max: number; soft: number | null }) {
  const { t } = useI18n()
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const size = 10
  const buckets = pityBuckets(drops, max, size)
  const top = Math.max(1, ...buckets.map((b) => b.count))
  const W = 560
  const H = 180
  const padL = 28
  const padB = 26
  const gap = 4
  const bw = (W - padL) / buckets.length - gap
  const ticks = top <= 4 ? Array.from({ length: top + 1 }, (_, i) => i) : [0, Math.round(top / 2), top]

  return (
    <figure className="hist">
      <div className="hist-head">
        <figcaption>
          <h3>{t('banner.histTitle')}</h3>
          <p className="muted">{t('banner.histNote', { n: size })}</p>
        </figcaption>
        <button className="link-btn" onClick={() => setTable((v) => !v)} aria-pressed={table}>
          {t('banner.tableView')}
        </button>
      </div>
      {table ? (
        <table className="mini-table">
          <tbody>
            {buckets.map((b) => (
              <tr key={b.from}>
                <th>
                  {b.from}–{b.to}
                </th>
                <td>{b.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="hist-wrap">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('banner.histTitle')}>
            {ticks.map((v) => {
              const y = H - padB - (v / top) * (H - padB - 10)
              return (
                <g key={v}>
                  <line x1={padL} x2={W} y1={y} y2={y} className="grid" />
                  <text x={padL - 8} y={y + 4} className="axis" textAnchor="end">
                    {v}
                  </text>
                </g>
              )
            })}
            {buckets.map((b, i) => {
              const h = (b.count / top) * (H - padB - 10)
              const x = padL + gap / 2 + i * (bw + gap)
              const y = H - padB - h
              const r = Math.min(4, h / 2)
              const isSoft = soft !== null && b.from > soft
              return (
                <g
                  key={b.from}
                  tabIndex={0}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  aria-label={t('banner.histTip', b)}
                >
                  <rect x={x - gap / 2} y={10} width={bw + gap} height={H - padB - 10} fill="transparent" />
                  {b.count > 0 && (
                    <path
                      className={'bar' + (isSoft ? ' bar--soft' : '') + (hover === i ? ' is-hover' : '')}
                      d={`M${x},${H - padB} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${H - padB} Z`}
                    />
                  )}
                  <text x={x + bw / 2} y={H - 8} className="axis" textAnchor="middle">
                    {b.to}
                  </text>
                </g>
              )
            })}
            <line x1={padL} x2={W} y1={H - padB} y2={H - padB} className="baseline" />
          </svg>
          {hover !== null && (
            <div className="tooltip" style={{ left: `${((padL + (hover + 0.5) * (bw + gap)) / W) * 100}%` }}>
              {t('banner.histTip', buckets[hover])}
            </div>
          )}
        </div>
      )}
    </figure>
  )
}
