import data from '../data/rewards.json'
import type { PullRecord, Rank } from './types'

/**
 * Reward names and ranks come from src/data/rewards.json, rebuilt daily from the
 * community datamine. Records keep only the raw reward ID as truth, so when a
 * new character lands in the dictionary, old history is relabelled for free.
 */
type Entry = [name: string, rank: Rank, type: string]

const REWARDS = (data as unknown as { rewards: Record<string, Entry> }).rewards
const ICONS = new Set((data as unknown as { icons: string[] }).icons)

export function lookup(id: string): { name: string; rank: Rank; type: string } | null {
  const e = REWARDS[id.toLowerCase()]
  return e ? { name: e[0], rank: e[1], type: e[2] } : null
}

export function hasIcon(id: string) {
  return ICONS.has(id.toLowerCase())
}

export function resolve(r: PullRecord): PullRecord {
  if (r.manual || !r.rewardId) return r
  const e = lookup(r.rewardId)
  if (!e) return { ...r, name: r.name && r.name !== r.rewardId ? r.name : `#${r.rewardId}` }
  return { ...r, name: e.name, rank: e.rank, rewardType: e.type }
}

const cache = new WeakMap<PullRecord[], PullRecord[]>()
export function resolveAll(records: PullRecord[]): PullRecord[] {
  let out = cache.get(records)
  if (!out) {
    out = records.map(resolve)
    cache.set(records, out)
  }
  return out
}
