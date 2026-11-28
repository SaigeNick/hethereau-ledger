import collection from '../data/collection.json'
import { lookup, resolveAll } from './dictionary'
import { computeStats } from './stats'
import { POOL_IDS, type Profile, type Rank } from './types'

export interface CharacterCopies {
  id: string
  name: string
  rank: 'S' | 'A'
  fromHistory: number
  manual: number
  total: number
}

/** Every gacha character with how many copies the profile has (history plus hand corrections). */
export function characterCopies(profile: Profile): CharacterCopies[] {
  const seen = new Map<string, number>()
  for (const pool of POOL_IDS)
    for (const r of resolveAll(profile.records[pool])) if (r.rewardType === 'character') seen.set(r.rewardId, (seen.get(r.rewardId) ?? 0) + 1)
  return collection.characters
    .map((id) => {
      const fromHistory = seen.get(id) ?? 0
      const manual = profile.collection?.chars?.[id] ?? 0
      const r = lookup(id)
      return { id, name: r?.name ?? id, rank: (r?.rank ?? 'S') as 'S' | 'A', fromHistory, manual, total: Math.max(0, fromHistory + manual) }
    })
    .sort((a, b) => (a.rank !== b.rank ? (a.rank === 'S' ? -1 : 1) : b.total - a.total || a.name.localeCompare(b.name)))
}

export interface Avatar {
  id: string
  name: string
  rank: Rank
}

/** The picked avatar, else the newest S-Class character from the limited board, else none. */
export function avatarOf(profile: Profile): Avatar | null {
  const pick = profile.avatar ? lookup(profile.avatar) : null
  if (profile.avatar && pick) return { id: profile.avatar, name: pick.name, rank: pick.rank }
  const recs = resolveAll(profile.records.Lottery_LimitedCharacter)
  for (let i = recs.length - 1; i >= 0; i--) {
    const r = recs[i]
    if (r.rank === 'S' && r.rewardType === 'character') return { id: r.rewardId, name: r.name, rank: 'S' }
  }
  return null
}

/** Headline numbers for a profile: pulls on all banners and S-Class rewards. */
export function quickStats(profile: Profile) {
  let pulls = 0
  let s = 0
  for (const pool of POOL_IDS) {
    const recs = profile.records[pool]
    if (!recs.length) continue
    const st = computeStats(pool, resolveAll(recs))
    pulls += st.totalPulls
    s += st.sDrops.length
  }
  return { pulls, s }
}
