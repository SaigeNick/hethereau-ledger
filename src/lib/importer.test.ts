import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { mergeRecords, normalizeRecords, parseExport, ticksToTime } from './importer'
import { decodePackets } from './nteDecoder'
import type { PullRecord } from './types'

// 2026-07-16 18:58:09 UTC
const TICKS = 639198250890000000n
const base = { pool: 'Arc_MiracleBox' as const, kind: 'arc', rewardType: 'arc', rank: 'B' as const }
const sync = (ord: number, rewardId: string, time = ticksToTime(TICKS)): PullRecord => ({
  ...base, uid: `Arc_MiracleBox:${TICKS}:${ord}`, time, ord, rewardId, name: rewardId, rank: '?', banner: 'Fork_Butterfly',
})
const exp = (ord: number, rewardId: string): PullRecord => ({
  ...base, uid: `hash${ord}`, time: '2026-07-16 18:58:09', ord, rewardId, name: rewardId.toUpperCase(), rank: 'A',
})

describe('one pull from two sources', () => {
  it('reads ticks as UTC like the exporter', () => {
    expect(ticksToTime(TICKS)).toBe('2026-07-16 18:58:09')
  })
  it('treats an exporter row and a sync row of the same slot as one pull', () => {
    const m = mergeRecords([exp(0, 'fork_yuren'), exp(1, 'fork_nonos')], [sync(0, 'fork_yuren'), sync(1, 'fork_nonos')])
    expect(m.added).toBe(0)
    expect(m.records).toHaveLength(2)
    // Keeps the sync uid, the exact banner and the exporter's name and rank.
    expect(m.records[1]).toMatchObject({ uid: `Arc_MiracleBox:${TICKS}:0`, banner: 'Fork_Butterfly', name: 'FORK_YUREN', rank: 'A' })
  })
  it('repairs rows saved earlier with local time', () => {
    const old = [exp(0, 'fork_yuren'), sync(0, 'fork_yuren', '2026-07-16 20:58:09')]
    const fixed = normalizeRecords(old)
    expect(fixed).toHaveLength(1)
    expect(fixed[0].time).toBe('2026-07-16 18:58:09')
  })
  it('never folds manual rows into real ones', () => {
    const manual = { ...exp(0, 'x'), uid: 'm1', manual: true }
    expect(normalizeRecords([exp(0, 'fork_yuren'), manual])).toHaveLength(2)
  })
})

describe('real exporter files plus a sync of the same account', () => {
  const files = ['Limited', 'Permanent', 'Arc', 'MysteryBox'].map((b) => `tests/private/sol-${b}_20260730_173854.json`)
  const capture = 'tests/private/sample-all.txt'
  it.skipIf(!files.every(existsSync) || !existsSync(capture))('adds only what the exporter lacks', () => {
    const packets = readFileSync(capture, 'utf8').trim().split('\n').map((b) => Uint8Array.from(Buffer.from(b, 'base64')))
    const synced = decodePackets(packets)
    const expected = { Lottery_LimitedCharacter: 304 + 623 - 234, Lottery_Permanent: 319 + 288 - 150, Arc_MiracleBox: 95 + 280 - 95, Gashapon_MysteryBox: 30 + 8 }
    for (const f of files) {
      const parsed = parseExport(readFileSync(f, 'utf8'))
      const once = mergeRecords([], parsed.records).records
      const both = mergeRecords(once, synced[parsed.pool]).records
      expect(both).toHaveLength(expected[parsed.pool])
      // Importing the same file again changes nothing.
      expect(mergeRecords(both, parsed.records).added).toBe(0)
    }
  })
})
