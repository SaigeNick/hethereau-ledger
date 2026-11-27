import { hasIcon } from '../lib/dictionary'
import { isBonus } from '../lib/banners'
import { useI18n } from '../lib/i18n'
import type { PullRecord } from '../lib/types'

export interface Row {
  r: PullRecord
  pity: number | null
}

function short(name: string) {
  const words = name.replace(/^#/, '').split(/[\s_]+/).filter(Boolean)
  return (words.length > 1 ? words.map((w) => w[0]).join('') : words[0]?.slice(0, 3) ?? '?').slice(0, 3)
}

/** One reward, drawn like the reward squares on the game's result screen. */
export function RewardTile({ row }: { row: Row }) {
  const { t } = useI18n()
  const { r, pity } = row
  const bonus = isBonus(r)
  const rankClass = r.rewardType === 'item' && r.rank !== 'S' ? 'tile-rank-item' : `tile-rank-${r.rank === '?' ? 'u' : r.rank}`
  const icon = r.rewardId && hasIcon(r.rewardId) ? `${import.meta.env.BASE_URL}portraits/${r.rewardId.toLowerCase()}.webp` : null
  const showPity = !bonus && pity !== null && r.rank === 'S' && r.rewardType !== 'item'
  const label = [r.name, r.rank !== '?' ? r.rank : '', showPity ? t('tile.pity', { n: pity! }) : '', bonus ? t(`banner.bonus.${r.kind}` as never) : '']
    .filter(Boolean)
    .join(', ')
  return (
    <li className={`rtile ${rankClass}${bonus ? ' is-bonus' : ''}`} title={label} aria-label={label}>
      {icon ? <img src={icon} alt="" loading="lazy" /> : <span className="rtile-txt">{short(r.name)}</span>}
      {r.qty && r.qty > 1 ? <span className="rtile-qty">×{r.qty}</span> : null}
      {showPity ? <span className="rtile-pity">{pity}</span> : null}
      {bonus ? <span className="rtile-bonus" aria-hidden="true">+</span> : null}
    </li>
  )
}

const dayOf = (time: string) => time.slice(0, 10)

/** Pulls grouped by day, in the order they were made, like the game's result screen. */
export function SessionList({ rows, limit, fmtTime }: { rows: Row[]; limit: number; fmtTime: (s: string) => string }) {
  const { t } = useI18n()
  const groups: { time: string; rows: Row[] }[] = []
  for (const row of rows) {
    const last = groups[groups.length - 1]
    if (last && dayOf(last.time) === dayOf(row.r.time)) last.rows.push(row)
    else groups.push({ time: row.r.time, rows: [row] })
  }
  return (
    <div className="sessions">
      {groups.slice(0, limit).map((g) => {
        const pulls = g.rows.filter((x) => !isBonus(x.r)).length
        const best = g.rows.some((x) => x.r.rank === 'S' && (x.r.rewardType === 'character' || x.r.rewardType === 'arc'))
        return (
          <section key={g.time + g.rows[0].r.uid} className={'session' + (best ? ' has-s' : '')}>
            <header>
              <span>{fmtTime(g.time)}</span>
              <span className="muted">{t('tile.pulls', { n: pulls })}</span>
            </header>
            <ul className="rtiles">
              {[...g.rows].reverse().map((row) => (
                <RewardTile key={row.r.uid} row={row} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

export function countSessions(rows: Row[]) {
  let n = 0
  let last = ''
  for (const row of rows) {
    if (dayOf(row.r.time) !== last) n++
    last = dayOf(row.r.time)
  }
  return n
}
