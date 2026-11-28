/**
 * Achievements from the game, two ways:
 * - the sync command appends the login block that starts at "AchievementRecord"
 *   as a frame tagged "HLACH1\0";
 * - NTE History Exporter writes "nte-achievement-export" JSON files.
 * Only completed achievements are taken; ticks on the site are never removed.
 */
export const ACH_TAG = new TextEncoder().encode('HLACH1\0')

export interface GameAchievement {
  id: string
  progress: number
  completed: boolean
}

export const isAchievementFrame = (f: Uint8Array) => f.length > ACH_TAG.length && ACH_TAG.every((b, i) => f[i] === b)

// Layout after the marker: u32 record count at +22, records from +38. Each
// record is a NUL-terminated ID, then u64 progress and u64 completion ticks.
const COUNT_AT = 22
const RECORDS_AT = 38
const MAX = 2000

export function parseAchievementBlock(block: Uint8Array): GameAchievement[] {
  if (block.length < RECORDS_AT || new TextDecoder('latin1').decode(block.subarray(0, 18)) !== 'AchievementRecord\0') return []
  const v = new DataView(block.buffer, block.byteOffset, block.byteLength)
  const count = v.getUint32(COUNT_AT, true)
  if (count > MAX) return []
  const text = new TextDecoder('latin1').decode(block)
  const re = /([A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_]+)\0/g
  re.lastIndex = RECORDS_AT
  const out: GameAchievement[] = []
  let m: RegExpExecArray | null
  while (out.length < count && (m = re.exec(text))) {
    const end = m.index + m[0].length
    if (end + 16 > block.length) break
    const progress = Number(v.getBigUint64(end, true))
    const ticks = v.getBigUint64(end + 8, true)
    out.push({ id: m[1], progress, completed: ticks !== 0n })
    re.lastIndex = end + 16
  }
  return out.length === count ? out : []
}

export function achievementsFromFrames(frames: Uint8Array[]): GameAchievement[] {
  for (const f of frames) if (isAchievementFrame(f)) return parseAchievementBlock(f.subarray(ACH_TAG.length))
  return []
}

/** Completed IDs from an exporter achievements file, or null when it is not one. */
export function parseAchievementExport(text: string): GameAchievement[] | null {
  let doc: any
  try {
    doc = JSON.parse(text)
  } catch {
    return null
  }
  if (doc?.format !== 'nte-achievement-export' || typeof doc.categories !== 'object' || !doc.categories) return null
  const out: GameAchievement[] = []
  for (const list of Object.values(doc.categories)) {
    if (!Array.isArray(list)) continue
    for (const r of list) {
      if (typeof r?.id !== 'string') continue
      out.push({ id: r.id, progress: Number(r.progress) || 0, completed: r.completed === true || r.status === 'completed' })
    }
  }
  return out
}

/** Our achievement IDs for the completed ones (game and asset casing can differ). */
export async function completedSiteIds(found: GameAchievement[]): Promise<string[]> {
  const { default: data } = await import('../data/achievements.json')
  const byLower = new Map(data.list.map((a: { id: string }) => [a.id.toLowerCase(), a.id]))
  const ids: string[] = []
  for (const a of found) {
    const id = a.completed ? byLower.get(a.id.toLowerCase()) : undefined
    if (id) ids.push(id)
  }
  return ids
}
