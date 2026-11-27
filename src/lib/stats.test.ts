import { describe, expect, it } from 'vitest'
import { expectedPullsMonopoly } from './banners'
import { demoFiles } from './demo'
import { mergeRecords, parseExport, sortChrono, ImportError } from './importer'
import { computeStats, pityBuckets } from './stats'
import type { PullRecord } from './types'

const rec = (over: Partial<PullRecord>): PullRecord => ({
  uid: Math.random().toString(36),
  pool: 'Lottery_LimitedCharacter',
  time: '2026-06-10 13:32:17',
  ord: 0,
  kind: 'dice',
  rewardType: 'item',
  rewardId: 'x',
  name: 'x',
  rank: 'B',
  ...over,
})

describe('rules', () => {
  it('expected pulls per S on a character board is about 53 (1.87%)', () => {
    const e = expectedPullsMonopoly()
    expect(e).toBeGreaterThan(52)
    expect(e).toBeLessThan(54.5)
  })
})

describe('ordering', () => {
  it('sorts oldest first and ordinal 0 last inside a timestamp', () => {
    const rows = [rec({ uid: 'a', ord: 0 }), rec({ uid: 'b', ord: 9 }), rec({ uid: 'c', time: '2026-06-09 10:00:00' })]
    expect(sortChrono(rows).map((r) => r.uid)).toEqual(['c', 'b', 'a'])
  })
})

describe('pity', () => {
  it('counts dice rolls only and resets on an S character', () => {
    const rows: PullRecord[] = []
    for (let i = 0; i < 9; i++) rows.push(rec({ time: `2026-06-10 10:00:0${i}` }))
    rows.push(rec({ time: '2026-06-10 10:00:10', kind: 'points_gift' }))
    rows.push(rec({ time: '2026-06-10 10:00:11', rewardType: 'character', rank: 'S', name: 'Hotori' }))
    rows.push(rec({ time: '2026-06-10 10:00:12' }))
    const s = computeStats('Lottery_LimitedCharacter', rows)
    expect(s.sDrops).toHaveLength(1)
    expect(s.sDrops[0].pity).toBe(10)
    expect(s.currentPity).toBe(1)
    expect(s.totalPulls).toBe(11)
  })

  it('never lets a bonus row reset pity or count as a pull', () => {
    const rows: PullRecord[] = [
      rec({ time: '2026-06-10 10:00:01' }),
      rec({ time: '2026-06-10 10:00:02', kind: 'points_gift', rewardType: 'character', rank: 'S' }),
      rec({ time: '2026-06-10 10:00:03', kind: 'chase_reward', rewardType: 'character', rank: 'S' }),
      rec({ time: '2026-06-10 10:00:04', kind: 'points_gift', rewardType: 'arc', rank: 'A' }),
    ]
    const s = computeStats('Lottery_LimitedCharacter', rows)
    expect(s.sDrops).toHaveLength(0)
    expect(s.currentPity).toBe(1)
    expect(s.totalPulls).toBe(1)
    expect(s.bonusCount).toBe(3)
    expect(s.aCount).toBe(0)
  })

  it('lists outfits that drop from rolls as rare drops', () => {
    const rows = [rec({ time: '2026-06-10 10:00:01', rewardType: 'cosmetic', rank: 'A', name: 'Priceless Orchid' })]
    expect(computeStats('Lottery_LimitedCharacter', rows).rareDrops).toHaveLength(1)
  })

  it('does not reset character pity on an S item', () => {
    const rows = [rec({ time: '2026-06-10 10:00:01', rank: 'S', rewardType: 'item' })]
    expect(computeStats('Lottery_LimitedCharacter', rows).currentPity).toBe(1)
  })

  it('buckets pity values', () => {
    const b = pityBuckets([{ pity: 1, record: rec({}) }, { pity: 90, record: rec({}) }, { pity: 71, record: rec({}) }], 90)
    expect(b[0].count).toBe(1)
    expect(b[7].count).toBe(1)
    expect(b[8].count).toBe(1)
  })
})

describe('import', () => {
  it('parses demo files and dedupes on re-import', () => {
    const files = demoFiles().map(parseExport)
    expect(files.map((f) => f.pool)).toEqual(['Lottery_LimitedCharacter', 'Lottery_Permanent', 'Arc_MiracleBox', 'Gashapon_MysteryBox'])
    const first = mergeRecords([], files[0].records)
    const again = mergeRecords(first.records, files[0].records)
    expect(again.added).toBe(0)
    expect(again.records.length).toBe(346)
    const s = computeStats('Lottery_LimitedCharacter', first.records)
    expect(s.totalPulls).toBe(310)
    expect(s.sDrops.every((d) => d.pity <= 90)).toBe(true)
    const arc = computeStats('Arc_MiracleBox', mergeRecords([], files[2].records).records)
    expect(arc.sDrops.every((d) => d.pity <= 60)).toBe(true)
  })

  it('parses the documented example record', () => {
    const doc = {
      format: 'nte-history-export',
      format_version: 1,
      banner: { id: 'Lottery_LimitedCharacter' },
      user_uid: '218216016349',
      account_region: 'EU',
      records: [
        { uid: '7aae34232160e950ecc7b5da38812caa', pool_group_id: 'Lottery_LimitedCharacter', timestamp: '2026-06-10 13:32:17', timestamp_group_ordinal: 0, roll_result: 5, result_type: 'dice', reward_type: 'character', reward_id: '1033', reward_name: 'Adler', reward_rank: 'A', quantity: 1 },
      ],
    }
    const p = parseExport(JSON.stringify(doc))
    expect(p.gameUid).toBe('218216016349')
    expect(p.records[0]).toMatchObject({ name: 'Adler', rank: 'A', kind: 'dice', roll: 5 })
  })

  it('rejects other files with a clear code', () => {
    expect(() => parseExport('nope')).toThrow(ImportError)
    try {
      parseExport('{"format":"something"}')
    } catch (e) {
      expect((e as ImportError).code).toBe('wrong_format')
    }
  })
})
