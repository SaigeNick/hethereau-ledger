import { describe, expect, it } from 'vitest'
import { mergeStates } from './syncMerge'
import { emptyRecords, type Profile, type PullRecord, type StoreState } from './types'

const rec = (uid: string, time: string): PullRecord => ({
  uid, pool: 'Lottery_LimitedCharacter', time, ord: 0, kind: 'dice', rewardType: 'item', rewardId: 'x', name: 'x', rank: 'B',
})
const prof = (id: string, uids: string[], extra: Partial<Profile> = {}): Profile => ({
  id, name: id, updatedAt: '2026-01-01T00:00:00Z',
  records: { ...emptyRecords(), Lottery_LimitedCharacter: uids.map((u, i) => rec(u, `2026-01-0${i + 1} 10:00:00`)) },
  ...extra,
})
const st = (profiles: Profile[], tomb?: StoreState['tombstones']): StoreState => ({ version: 1, activeId: profiles[0].id, profiles, tombstones: tomb })

describe('mergeStates', () => {
  it('unites pulls of the same profile', () => {
    const m = mergeStates(st([prof('a', ['1', '2'])]), st([prof('a', ['2', '3'])]))
    expect(m.profiles).toHaveLength(1)
    expect(m.profiles[0].records.Lottery_LimitedCharacter.map((r) => r.uid)).toEqual(['1', '2', '3'])
  })
  it('matches profiles by game UID across devices', () => {
    const m = mergeStates(st([prof('a', ['1'], { gameUid: '42' })]), st([prof('b', ['2'], { gameUid: '42' })]))
    expect(m.profiles).toHaveLength(1)
    expect(m.profiles[0].records.Lottery_LimitedCharacter).toHaveLength(2)
  })
  it('keeps deletions from either side', () => {
    const local = st([prof('a', ['1', '2']), prof('b', ['9'])], { profiles: ['b'], records: [] })
    const remote = st([prof('a', ['1', '2']), prof('b', ['9'])], { profiles: [], records: ['2'] })
    const m = mergeStates(local, remote)
    expect(m.profiles.map((p) => p.id)).toEqual(['a'])
    expect(m.profiles[0].records.Lottery_LimitedCharacter.map((r) => r.uid)).toEqual(['1'])
  })
  it('adds profiles that exist only in the cloud and drops empty starters', () => {
    const empty = { ...prof('s', []), name: '' }
    const m = mergeStates(st([empty]), st([prof('c', ['5'])]))
    expect(m.profiles.map((p) => p.id)).toEqual(['c'])
    expect(m.activeId).toBe('c')
  })
})

describe('achievements in sync', () => {
  it('keeps ticks from both devices', () => {
    const m = mergeStates(st([prof('a', ['1'], { achievements: ['x', 'y'] })]), st([prof('a', ['1'], { achievements: ['y', 'z'] })]))
    expect(m.profiles[0].achievements?.sort()).toEqual(['x', 'y', 'z'])
  })
})
