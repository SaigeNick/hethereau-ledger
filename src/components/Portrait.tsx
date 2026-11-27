import type { Rank } from '../lib/types'

/**
 * Character art: drop files named <reward_id>.webp (or .png/.jpg) into
 * src/assets/portraits/ and rebuild. Until a file is there, a monogram in
 * the rank colour stands in, and no broken image is requested.
 */
const files = import.meta.glob('../assets/portraits/*.{webp,png,jpg,jpeg,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const byId = new Map<string, string>()
for (const [path, url] of Object.entries(files)) {
  const id = path.split('/').pop()!.replace(/\.[^.]+$/, '')
  byId.set(id.toLowerCase(), url)
}

export function Portrait({ id, name, rank, size = 44 }: { id: string; name: string; rank: Rank; size?: number }) {
  const src = byId.get(id.toLowerCase())
  const initials = name
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
