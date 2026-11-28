import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decodePacket, decodePackets } from './nteDecoder'
import { decodeTargets, encodeTargets, newestTargets, pageHas, patternsOf, ticksRange } from './syncHint'
import { emptyRecords, type PullRecord } from './types'

const rec = (uid: string, time: string, extra: Partial<PullRecord> = {}): PullRecord => ({
  uid, time, ord: 0, pool: 'Lottery_LimitedCharacter', kind: 'dice', rewardId: 'x', rewardType: 'item', name: 'x', rank: 'B', ...extra,
})

describe('stop marker in the command', () => {
  it('round-trips through the URL form', () => {
    const records = emptyRecords()
    records.Lottery_LimitedCharacter = [rec('Lottery_LimitedCharacter:639196234890123456:0', '2026-07-16 18:58:09')]
    records.Arc_MiracleBox = [rec('hash', '2026-07-16 18:58:09', { pool: 'Arc_MiracleBox' })]
    const t = newestTargets(records)
    const key = encodeTargets(t)
    expect(key).toMatch(/^l[0-9a-z]+-a[0-9a-z]+\.[0-9a-z]+$/)
    expect(decodeTargets(key)).toEqual(t)
    expect(t[1].hi - t[1].lo).toBe(9_999_999n)
  })
  it('skips manual rows and rejects junk', () => {
    expect(ticksRange(rec('m1', '2026-01-01 00:00:00', { manual: true }))).toBeNull()
    expect(decodeTargets('x123-l!!-l1.zzzzzzz')).toEqual([])
  })
})

const capture = 'tests/private/sample-all.txt'
describe.skipIf(!existsSync(capture))('on a real capture', () => {
  const packets = existsSync(capture) ? readFileSync(capture, 'utf8').trim().split('\n').map((b) => Uint8Array.from(Buffer.from(b, 'base64'))) : []
  const synced = existsSync(capture) ? decodePackets(packets) : null

  for (const pool of ['Lottery_LimitedCharacter', 'Arc_MiracleBox', 'Lottery_Permanent'] as const) {
    it(`finds the page with a saved ${pool} pull and no other page`, () => {
      const rows = synced![pool]
      // A pull in the middle of the history, as if the site had everything up to it.
      const target = rows[Math.floor(rows.length / 2)]
      for (const exact of [true, false]) {
        const range = exact ? ticksRange(target)! : ticksRange({ ...target, uid: 'exporter' })!
        const pats = patternsOf({ pool, lo: range[0], hi: range[1] })
        const hits = packets.filter((p) => pageHas(p, pats))
        expect(hits.length).toBeGreaterThan(0)
        // Every hit really is a page holding a pull from that second.
        for (const h of hits) {
          const times = decodePacket(h).flatMap((pg) => pg.rows.map((r) => r.ticks / 10_000_000n))
          expect(times).toContain(range[0] / 10_000_000n)
        }
      }
    })
  }
})
