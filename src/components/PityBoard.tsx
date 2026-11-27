import { useEffect, useState } from 'react'
import { useI18n } from '../lib/i18n'

function useNarrow(query = '(max-width: 600px)') {
  const [m, setM] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(query).matches)
  useEffect(() => {
    const mq = matchMedia(query)
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return m
}

interface Props {
  current: number
  max: number
  soft: number | null
  cols: { wide: number; narrow: number }
  compact?: boolean
}

/**
 * The pity counter drawn as the game's board: tiles follow a snake path,
 * rolls already made are lit, the piece stands on the current tile.
 */
export function PityBoard({ current, max, soft, cols, compact }: Props) {
  const { t } = useI18n()
  const narrow = useNarrow()
  if (compact) {
    // Overview: one straight strip of ticks, read left to right.
    return (
      <div className="strip" role="img" aria-label={t('board.aria', { n: current, max })}>
        {Array.from({ length: max }, (_, k) => {
          const i = k + 1
          const cls = ['tick']
          if (i <= current) cls.push('is-done')
          if (i === current) cls.push('is-piece')
          if (soft && i > soft && i < max) cls.push('is-soft')
          if (i === max) cls.push('is-hard')
          return <span key={i} className={cls.join(' ')} />
        })}
      </div>
    )
  }
  const c = narrow ? cols.narrow : cols.wide
  const rows = Math.ceil(max / c)
  const tiles = []
  for (let i = 1; i <= max; i++) {
    const row = Math.floor((i - 1) / c)
    const pos = (i - 1) % c
    const col = row % 2 === 0 ? pos : c - 1 - pos
    const cls = ['tile']
    if (i <= current) cls.push('is-done')
    if (i === current) cls.push('is-piece')
    if (soft && i > soft && i < max) cls.push('is-soft')
    if (i === max) cls.push('is-hard')
    // Where the path turns, show which way it continues.
    const turn = pos === c - 1 && i < max ? 'turn' : ''
    tiles.push(
      <span key={i} className={cls.join(' ') + (turn ? ' ' + turn : '')} style={{ gridRow: row + 1, gridColumn: col + 1 }}>
        {(i === max || i === soft || i % 10 === 0 || i === current) ? <em>{i}</em> : null}
      </span>,
    )
  }
  return (
    <div
      className="board"
      role="img"
      aria-label={t('board.aria', { n: current, max })}
      style={{ gridTemplateColumns: `repeat(${c}, 1fr)`, gridTemplateRows: `repeat(${rows}, auto)` }}
    >
      {tiles}
    </div>
  )
}

export function BoardLegend({ max, soft }: { max: number; soft: number | null }) {
  const { t } = useI18n()
  return (
    <ul className="board-legend">
      <li>
        <span className="swatch is-done" /> {t('board.legendPulled')}
      </li>
      {soft ? (
        <li>
          <span className="swatch is-soft" /> {t('board.legendSoft', { n: soft })}
        </li>
      ) : null}
      <li>
        <span className="swatch is-hard" /> {t('board.legendHard', { n: max })}
      </li>
    </ul>
  )
}
