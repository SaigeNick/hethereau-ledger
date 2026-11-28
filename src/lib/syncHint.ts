import { POOL_IDS, type PoolId, type PoolRecords, type PullRecord } from './types'

/**
 * "Where to stop scrolling" for the sync command.
 *
 * The site puts the time of the newest saved pull of each banner into the
 * command. The script then looks for that timestamp in the history pages
 * coming from the game and says when the user has reached pulls the site
 * already has. It never decodes pages; it compares bytes.
 */

const TAG: Record<PoolId, string> = {
  Lottery_LimitedCharacter: 'l',
  Lottery_Permanent: 'p',
  Arc_MiracleBox: 'a',
  Gashapon_MysteryBox: 'm',
}
const EPOCH_TICKS = 621_355_968_000_000_000n
const SECOND = 10_000_000n

export interface Target {
  pool: PoolId
  lo: bigint
  hi: bigint
}

/** Exact ticks for rows from the command; the whole second for exporter rows. */
export function ticksRange(r: PullRecord): [bigint, bigint] | null {
  if (r.manual) return null
  const m = /:(\d{15,}):\d+$/.exec(r.uid)
  if (m) {
    const t = BigInt(m[1])
    return [t, t]
  }
  const ms = Date.parse(r.time.replace(' ', 'T') + 'Z')
  if (Number.isNaN(ms)) return null
  const lo = BigInt(ms) * 10_000n + EPOCH_TICKS
  return [lo, lo + SECOND - 1n]
}

export function newestTargets(records: PoolRecords): Target[] {
  const out: Target[] = []
  for (const pool of POOL_IDS) {
    let best: PullRecord | undefined
    for (const r of records[pool] ?? []) {
      if (r.manual) continue
      if (!best || r.time > best.time || (r.time === best.time && r.ord < best.ord)) best = r
    }
    const range = best && ticksRange(best)
    if (range) out.push({ pool, lo: range[0], hi: range[1] })
  }
  return out
}

/** Compact form for the URL: "l<lo>[.<hi-lo>]-a<lo>…", numbers in base 36. */
export function encodeTargets(targets: Target[]): string {
  return targets.map((t) => TAG[t.pool] + t.lo.toString(36) + (t.hi > t.lo ? '.' + (t.hi - t.lo).toString(36) : '')).join('-')
}

const parse36 = (s: string) => [...s].reduce((n, c) => n * 36n + BigInt(parseInt(c, 36)), 0n)

export function decodeTargets(key: string): Target[] {
  const byTag = Object.fromEntries(Object.entries(TAG).map(([p, t]) => [t, p as PoolId]))
  const out: Target[] = []
  for (const part of key.split('-')) {
    const m = /^([lpam])([0-9a-z]{1,13})(?:\.([0-9a-z]{1,6}))?$/.exec(part)
    if (!m) continue
    const lo = parse36(m[2])
    const hi = lo + (m[3] ? parse36(m[3]) : 0n)
    if (hi - lo > SECOND) continue
    out.push({ pool: byTag[m[1]], lo, hi })
  }
  return out
}

/**
 * Byte patterns the timestamp can leave in a page. A 64-bit value starting at
 * bit k of a byte spans 9 bytes; bytes 3..7 carry bits 24-k..63-k of it, so
 * they are fully known for any k. Each 40-bit pattern is one of those windows.
 */
export function patternsOf(t: Target): Set<bigint> {
  const out = new Set<bigint>()
  const mask = (1n << 40n) - 1n
  for (let k = 0n; k < 8n; k++) {
    const shift = 24n - k
    for (let w = t.lo >> shift; w <= t.hi >> shift; w++) out.add(w & mask)
  }
  return out
}

/** True when the page contains one of the patterns (what the script checks). */
export function pageHas(data: Uint8Array, patterns: Set<bigint>): boolean {
  for (let i = 0; i + 5 <= data.length; i++) {
    let w = 0n
    for (let j = 4; j >= 0; j--) w = (w << 8n) | BigInt(data[i + j])
    if (patterns.has(w)) return true
  }
  return false
}
