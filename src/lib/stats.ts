import { RULES } from './banners'
import { sortChrono } from './importer'
import type { PoolId, PullRecord } from './types'

export interface TopDrop {
  record: PullRecord
  /** Pulls it took, counting the pull that produced it. */
  pity: number
}

export interface PoolStats {
  pool: PoolId
  totalPulls: number
  currentPity: number
  sinceLastA: number
  sDrops: TopDrop[]
  aCount: number
  avgPity: number | null
  /** Your S rate divided by the typical rate; above 1 means luckier. */
  luck: number | null
  firstTime?: string
  lastTime?: string
}

export function computeStats(pool: PoolId, input: PullRecord[]): PoolStats {
  const rules = RULES[pool]
  const records = sortChrono(input)
  let counter = 0
  let sinceA = 0
  let totalPulls = 0
  let aCount = 0
  const sDrops: TopDrop[] = []

  for (const r of records) {
    const pull = rules.isPull(r)
    if (pull) {
      counter++
      sinceA++
      totalPulls++
    }
    if (rules.isTopDrop(r)) {
      // A bonus row (Chase Reward) belongs to the roll before it.
      sDrops.push({ record: r, pity: Math.max(counter, 1) })
      counter = 0
      sinceA = 0
    } else if (r.rank === 'A' && (r.rewardType === 'character' || r.rewardType === 'arc')) {
      aCount++
      sinceA = 0
    }
  }

  const avgPity = sDrops.length ? sDrops.reduce((s, d) => s + d.pity, 0) / sDrops.length : null
  let luck: number | null = null
  if (rules.consolidatedRate && sDrops.length > 0) {
    // Only completed cycles count, so the open streak does not skew it.
    const pullsInCycles = totalPulls - counter
    if (pullsInCycles > 0) luck = sDrops.length / pullsInCycles / rules.consolidatedRate
  }

  return {
    pool,
    totalPulls,
    currentPity: counter,
    sinceLastA: sinceA,
    sDrops,
    aCount,
    avgPity,
    luck,
    firstTime: records[0]?.time,
    lastTime: records[records.length - 1]?.time,
  }
}

/** Histogram of S pity in buckets of `size` up to `max`. */
export function pityBuckets(drops: TopDrop[], max: number, size = 10) {
  const n = Math.ceil(max / size)
  const buckets = Array.from({ length: n }, (_, i) => ({ from: i * size + 1, to: (i + 1) * size, count: 0 }))
  for (const d of drops) {
    const i = Math.min(n - 1, Math.floor((d.pity - 1) / size))
    buckets[i].count++
  }
  return buckets
}
