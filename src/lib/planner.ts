/**
 * Pull planner for character boards (no 50/50: every S character is the featured one).
 * Per-roll S chance: 0.99% for rolls 1–70, 19.59% for 71–89, roll 90 guaranteed.
 */
export const ANNULITH_PER_ROLL = 160
const BASE = 0.0099
const BOOSTED = 0.1959
const SOFT = 70
const HARD = 90

/** S chance on the k-th roll since the last S (k is 1-based). */
export function rateAt(k: number) {
  return k >= HARD ? 1 : k > SOFT ? BOOSTED : BASE
}

/**
 * Chance of getting at least 1..maxCopies S within `rolls`, starting at `pity`
 * rolls since the last S. Returns an array where [i] = P(at least i+1 copies).
 */
export function chanceOfCopies(rolls: number, pity: number, maxCopies: number): number[] {
  const p0 = Math.max(0, Math.min(HARD - 1, Math.floor(pity)))
  const n = Math.max(0, Math.floor(rolls))
  // dist[c][k]: probability of having c copies (c capped at maxCopies) with k rolls since last S
  let dist = Array.from({ length: maxCopies + 1 }, () => new Float64Array(HARD))
  dist[0][p0] = 1
  for (let r = 0; r < n; r++) {
    const next = Array.from({ length: maxCopies + 1 }, () => new Float64Array(HARD))
    for (let c = 0; c <= maxCopies; c++) {
      const row = dist[c]
      for (let k = 0; k < HARD; k++) {
        const m = row[k]
        if (!m) continue
        if (c === maxCopies) {
          next[c][0] += m
          continue
        }
        const p = rateAt(k + 1)
        next[c + 1][0] += m * p
        if (p < 1) next[c][k + 1] += m * (1 - p)
      }
    }
    dist = next
  }
  const totals = dist.map((row) => row.reduce((a, b) => a + b, 0))
  return Array.from({ length: maxCopies }, (_, i) => Math.min(1, totals.slice(i + 1).reduce((a, b) => a + b, 0)))
}

/** Rolls needed to be certain of `copies` S, starting at `pity`. */
export function rollsToGuarantee(pity: number, copies: number) {
  return HARD - Math.min(HARD - 1, Math.max(0, pity)) + HARD * (copies - 1)
}

/** Smallest number of rolls that reaches `target` chance of `copies`. */
export function rollsForChance(pity: number, copies: number, target: number) {
  const max = rollsToGuarantee(pity, copies)
  let lo = 0
  let hi = max
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (chanceOfCopies(mid, pity, copies)[copies - 1] >= target) hi = mid
    else lo = mid + 1
  }
  return lo
}

export interface PlanInput {
  pity: number
  annulith: number
  dice: number
  dailyAnnulith: number
  days: number
  copies: number
}

export function plan(i: PlanInput) {
  const annulith = Math.max(0, i.annulith) + Math.max(0, i.dailyAnnulith) * Math.max(0, i.days)
  const rolls = Math.max(0, Math.floor(i.dice)) + Math.floor(annulith / ANNULITH_PER_ROLL)
  const chances = chanceOfCopies(rolls, i.pity, i.copies)
  const guarantee = rollsToGuarantee(i.pity, i.copies)
  const missing = Math.max(0, guarantee - rolls)
  return {
    rolls,
    chances,
    chance: chances[i.copies - 1],
    guarantee,
    missingRolls: missing,
    missingAnnulith: missing * ANNULITH_PER_ROLL - (missing ? annulith % ANNULITH_PER_ROLL : 0),
    forHalf: rollsForChance(i.pity, i.copies, 0.5),
  }
}
