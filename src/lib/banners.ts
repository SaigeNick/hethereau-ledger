import type { PoolId, PullRecord } from './types'

/**
 * Gacha rules as published by the community (Prydwen, GameWith) in 2026.
 * Bonus rows (every-10 A reward, Chase Reward) appear in history but never
 * count as pulls and never touch pity.
 * Character boards: 0.99% per roll, board changes after 70 rolls (~19.6%),
 * the 90th roll guarantees the featured S. Arc box: S guaranteed within 60 pulls.
 */
export interface PoolRules {
  id: PoolId
  system: 'monopoly' | 'gashapon'
  /** Pulls until a guaranteed S, or null when there is no pity. */
  hardPity: number | null
  /** Roll after which the board is modified (higher S odds). */
  softFrom: number | null
  /** Average S rate including pity, used for the luck comparison. */
  consolidatedRate: number | null
  /** What counts as a pull (Points Gift / Chase Reward rows are bonuses). */
  isPull: (r: PullRecord) => boolean
  /** What resets pity. */
  isTopDrop: (r: PullRecord) => boolean
  /** Columns of the board track; tracks are drawn as a snake path. */
  trackCols: { wide: number; narrow: number }
}

const monopolyPull = (r: PullRecord) => r.kind === 'dice' || r.kind === 'manual'
/** Bonus rows: the A reward every 10 rolls (Points Gift) and the Chase Reward. Never pulls, never pity. */
export const isBonus = (r: PullRecord) => r.kind === 'points_gift' || r.kind === 'chase_reward'
const sCharacter = (r: PullRecord) => monopolyPull(r) && r.rank === 'S' && r.rewardType === 'character'

export const RULES: Record<PoolId, PoolRules> = {
  Lottery_LimitedCharacter: {
    id: 'Lottery_LimitedCharacter',
    system: 'monopoly',
    hardPity: 90,
    softFrom: 70,
    consolidatedRate: 0.0187,
    isPull: monopolyPull,
    isTopDrop: sCharacter,
    trackCols: { wide: 15, narrow: 10 },
  },
  Lottery_Permanent: {
    id: 'Lottery_Permanent',
    system: 'monopoly',
    hardPity: 90,
    softFrom: 70,
    consolidatedRate: 0.0187,
    isPull: monopolyPull,
    isTopDrop: sCharacter,
    trackCols: { wide: 15, narrow: 10 },
  },
  Arc_MiracleBox: {
    id: 'Arc_MiracleBox',
    system: 'gashapon',
    hardPity: 60,
    softFrom: null,
    consolidatedRate: 0.0419,
    isPull: () => true,
    isTopDrop: (r) => r.rank === 'S',
    trackCols: { wide: 10, narrow: 10 },
  },
  Gashapon_MysteryBox: {
    id: 'Gashapon_MysteryBox',
    system: 'gashapon',
    hardPity: null,
    softFrom: null,
    consolidatedRate: null,
    isPull: () => true,
    isTopDrop: (r) => r.rank === 'S',
    trackCols: { wide: 15, narrow: 15 },
  },
}

/** Expected pulls per S for a character board, used in tests as a sanity check. */
export function expectedPullsMonopoly(base = 0.0099, boosted = 0.1959, soft = 70, hard = 90): number {
  let survive = 1
  let expected = 0
  for (let k = 1; k <= hard; k++) {
    const p = k === hard ? 1 : k > soft ? boosted : base
    expected += k * survive * p
    survive *= 1 - p
  }
  return expected
}
