import { ARC_FEATURED } from '../data/arcBanners'
import { resolveAll } from './dictionary'
import { sortChrono } from './importer'
import type { PullRecord } from './types'

export const isFeaturedArc = (r: PullRecord) => r.rank === 'S' && !!r.banner && ARC_FEATURED[r.banner] === r.rewardId

/**
 * Arc pity has two counters: pulls since any S Arc (S guaranteed at 60) and
 * pulls since the featured Arc (guaranteed at 80). An off-banner S resets only
 * the first one. Returns the current counters and, for every featured Arc, the
 * pull it came on counted from the previous featured one.
 */
export function arcPity(records: PullRecord[]) {
  let sinceS = 0
  let sinceF = 0
  const featuredPity = new Map<string, number>()
  for (const r of sortChrono(resolveAll(records))) {
    sinceS++
    sinceF++
    if (r.rank === 'S') {
      if (isFeaturedArc(r)) {
        featuredPity.set(r.uid, sinceF)
        sinceF = 0
      }
      sinceS = 0
    }
  }
  return { sinceS, sinceF, featuredPity }
}
