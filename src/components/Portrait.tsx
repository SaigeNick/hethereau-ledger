import { hasIcon } from '../lib/dictionary'
import type { Rank } from '../lib/types'

/** Portraits are fetched by scripts/update-rewards.mjs into public/portraits/<id>.webp. */
export function Portrait({ id, name, rank, size = 44 }: { id: string; name: string; rank: Rank; size?: number }) {
  const src = id && hasIcon(id) ? `${import.meta.env.BASE_URL}portraits/${id.toLowerCase()}.webp` : null
  const initials = name
    .replace(/^#/, '')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
  return (
    <span className={`portrait rank-${rank === '?' ? 'u' : rank}`} style={{ width: size, height: size }} aria-hidden="true">
      {src ? <img src={src} alt="" loading="lazy" /> : <span>{initials}</span>}
    </span>
  )
}
