export type PoolId =
  | 'Lottery_LimitedCharacter'
  | 'Lottery_Permanent'
  | 'Arc_MiracleBox'
  | 'Gashapon_MysteryBox'

export const POOL_IDS: PoolId[] = [
  'Lottery_LimitedCharacter',
  'Lottery_Permanent',
  'Arc_MiracleBox',
  'Gashapon_MysteryBox',
]

export type Rank = 'S' | 'A' | 'B' | 'C' | '?'

/** One row of history, normalized from the exporter or entered by hand. */
export interface PullRecord {
  uid: string
  pool: PoolId
  /** "YYYY-MM-DD HH:mm:ss" as shown in game history */
  time: string
  /** Order inside records sharing the same time; 0 is the newest. */
  ord: number
  /** dice | points_gift | chase_reward | single_pull | arc | manual */
  kind: string
  rewardType: string
  rewardId: string
  name: string
  rank: Rank
  qty?: number
  roll?: number
  manual?: boolean
  /** Exact banner, e.g. "Lottery_YeErMu", when the source knows it. */
  banner?: string
}

export type PoolRecords = Record<PoolId, PullRecord[]>

export interface Profile {
  id: string
  name: string
  /** Game account UID from the exporter. Never sent when sharing. */
  gameUid?: string
  region?: string
  records: PoolRecords
  updatedAt: string
  share?: { id: string; token: string; updatedAt: string; sig?: string }
  /** Share link this profile was copied from (a read-only copy on another device). */
  source?: string
}

export interface StoreState {
  version: 1
  activeId: string
  profiles: Profile[]
  /** What was deleted on this device, so a cloud sync doesn't bring it back. */
  tombstones?: { profiles: string[]; records: string[] }
}

/** What a shared link exposes: no game UID, no share token. */
export interface SharedSnapshot {
  v: 1
  name: string
  region?: string
  records: PoolRecords
  updatedAt: string
}

export function emptyRecords(): PoolRecords {
  return {
    Lottery_LimitedCharacter: [],
    Lottery_Permanent: [],
    Arc_MiracleBox: [],
    Gashapon_MysteryBox: [],
  }
}
