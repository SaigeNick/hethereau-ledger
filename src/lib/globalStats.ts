import { resolveAll } from './dictionary'
import { computeStats } from './stats'
import type { Profile } from './types'

/**
 * Anonymous community stats. Only numbers leave the browser: total pulls on the
 * limited board and the pity of each S. The key is a hash of the first pull's
 * internal ID, so re-sending replaces the old entry instead of adding a new one.
 */
const OPT_OUT = 'hethereau-ledger.statsOptOut'
const SENT = 'hethereau-ledger.statsSent'
const MIN_PULLS = 10

export interface Aggregate {
  players: number
  pulls: number
  sCount: number
  hist: number[]
  avgs: number[]
  updatedAt: number
}

export function statsOptedOut() {
  try {
    return localStorage.getItem(OPT_OUT) === '1'
  } catch {
    return true
  }
}
export function setStatsOptOut(v: boolean) {
  try {
    if (v) localStorage.setItem(OPT_OUT, '1')
    else localStorage.removeItem(OPT_OUT)
  } catch {
    /* ignore */
  }
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const keyOf = (seed: string) => sha256('hl-stats-v1:' + seed)

/** Deletes the numbers already sent for these profiles. Never throws. */
export async function withdraw(profiles: Profile[]) {
  const sent: Record<string, string> = (() => {
    try {
      return JSON.parse(localStorage.getItem(SENT) ?? '{}')
    } catch {
      return {}
    }
  })()
  for (const p of profiles) {
    try {
      const sum = summarize(p)
      if (!sum) continue
      const key = await keyOf(sum.seed)
      const res = await fetch('/api/stats?key=' + key, { method: 'DELETE' })
      if (res.ok) delete sent[key]
    } catch {
      /* offline: the entry expires on its own after 180 days */
    }
  }
  try {
    localStorage.setItem(SENT, JSON.stringify(sent))
  } catch {
    /* ignore */
  }
}

/** What would be sent for this profile, or null when there is nothing worth sending. */
export function summarize(profile: Profile) {
  if (profile.name === 'Demo' || profile.gameUid === 'demo') return null
  const recs = profile.records.Lottery_LimitedCharacter.filter((r) => !r.manual && r.kind !== 'manual')
  if (!recs.length) return null
  const s = computeStats('Lottery_LimitedCharacter', resolveAll(recs))
  if (s.totalPulls < MIN_PULLS) return null
  const first = [...recs].sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0))[0]
  return { seed: first.uid, pulls: s.totalPulls, pities: s.sDrops.map((d) => d.pity).slice(-200) }
}

/** Sends this profile's numbers if they changed since the last send. Never throws. */
export async function contribute(profile: Profile) {
  try {
    if (statsOptedOut()) return
    const sum = summarize(profile)
    if (!sum) return
    const key = await keyOf(sum.seed)
    const sig = `${key}:${sum.pulls}:${sum.pities.join(',')}`
    const sent: Record<string, string> = JSON.parse(localStorage.getItem(SENT) ?? '{}')
    if (sent[key] === sig) return
    const res = await fetch('/api/stats', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key, pulls: sum.pulls, pities: sum.pities }),
    })
    if (res.ok) {
      sent[key] = sig
      localStorage.setItem(SENT, JSON.stringify(sent))
    }
  } catch {
    /* offline or blocked: try again next visit */
  }
}

export async function fetchAggregate(): Promise<Aggregate | null> {
  try {
    const res = await fetch('/api/stats')
    if (!res.ok) return null
    const a = (await res.json()) as Aggregate
    return Array.isArray(a?.hist) && Array.isArray(a?.avgs) ? a : null
  } catch {
    return null
  }
}

/** Share of players whose average S pity is higher (worse) than `avg`, 0..1. */
export function luckierThan(avgs: number[], avg: number) {
  if (!avgs.length) return null
  let lo = 0
  let hi = avgs.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (avgs[mid] <= avg) lo = mid + 1
    else hi = mid
  }
  return (avgs.length - lo) / avgs.length
}
