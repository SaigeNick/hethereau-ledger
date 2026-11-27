import { existsSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { resolveAll } from './dictionary'
import { assemble, decodePacket, decodePackets, shiftBits, unpackSync } from './nteDecoder'
import { computeStats } from './stats'

const enc = new TextEncoder()
function fstr(s: string) {
  const b = enc.encode(s + '\0')
  const out = new Uint8Array(4 + b.length)
  new DataView(out.buffer).setInt32(0, b.length, true)
  out.set(b, 4)
  return out
}
function i32(n: number) {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setInt32(0, n, true)
  return b
}
function i64(n: bigint) {
  const b = new Uint8Array(8)
  new DataView(b.buffer).setBigInt64(0, n, true)
  return b
}
function cat(...parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0))
  let o = 0
  for (const p of parts) (out.set(p, o), (o += p.length))
  return out
}
/** Builds a packet the way the game does, then misaligns it by `bits`. */
function fakePacket(page: number, rows: [number, string, bigint][], bits: number) {
  const env = cat(new Uint8Array([0, 0, 3, 2, 0, 0]), i32(page << 7), new Uint8Array([0x80, 0x0f, 2, 0, 0, 0, 1, 0, 0, 0, 0x12]))
  const body = cat(
    env,
    fstr('FMonopolyLotteryRecordData'),
    i32(0),
    i32(500),
    i32(rows.length),
    ...rows.flatMap(([roll, reward, t]) => [i32(roll), fstr(reward), i32(0), i32(1), fstr(reward.split(',')[0]), fstr('CardPool_Character'), i64(t), fstr('Lottery_YeErMu')]),
  )
  // Shift left by `bits` so the decoder has to find the alignment.
  const big = BigInt('0x' + [...body].reverse().map((x) => x.toString(16).padStart(2, '0')).join('')) << BigInt(bits)
  const out = new Uint8Array(body.length + 1)
  let v = big
  for (let i = 0; i < out.length; i++) (out[i] = Number(v & 0xffn), (v >>= 8n))
  return out
}

const T = 639_300_000_000_000_000n

describe('nte decoder', () => {
  it('shifts bit streams', () => {
    expect([...shiftBits(new Uint8Array([0b10110000, 0b00000001]), 4)]).toEqual([0b00011011, 0])
  })

  it('finds a misaligned page and reads every field', () => {
    const p = fakePacket(1, [[0, '1020', T], [3, 'Dice_ticket_02,30', T - 1n]], 3)
    const pages = decodePacket(p)
    expect(pages).toHaveLength(1)
    expect(pages[0].page).toBe(1)
    expect(pages[0].rows[1]).toMatchObject({ roll: 3, reward: 'Dice_ticket_02,30', banner: 'Lottery_YeErMu' })
  })

  it('assembles pages by number, keeps the latest copy, and builds stable uids', () => {
    const p2 = fakePacket(2, [[5, '1090', T - 10n]], 5)
    const p1 = fakePacket(1, [[0, '1020', T], [4, 'fork_vine', T]], 1)
    const recs = decodePackets([p2, p1, p1]).Lottery_LimitedCharacter
    expect(recs.map((r) => r.rewardId)).toEqual(['1020', 'fork_vine', '1090'])
    expect(recs.map((r) => r.kind)).toEqual(['points_gift', 'dice', 'dice'])
    expect(recs[1].uid).toBe(`Lottery_LimitedCharacter:${T}:1`)
    expect(recs[0].banner).toBe('Lottery_YeErMu')
  })

  it('unpacks the HL1 clipboard format', async () => {
    const a = new Uint8Array([1, 2, 3])
    const frames = cat(i32(a.length), a, i32(1), new Uint8Array([9]))
    const text = 'HL1:' + gzipSync(frames).toString('base64')
    const out = await unpackSync(text)
    expect(out.map((x) => [...x])).toEqual([[1, 2, 3], [9]])
  })

  const fixture = 'tests/private/sample-limited.txt'
  it.skipIf(!existsSync(fixture))('decodes a real capture end to end', () => {
    const packets = readFileSync(fixture, 'utf8').split('\n').filter(Boolean).map((b) => new Uint8Array(Buffer.from(b, 'base64')))
    const recs = decodePackets(packets).Lottery_LimitedCharacter
    expect(recs).toHaveLength(623)
    const s = computeStats('Lottery_LimitedCharacter', resolveAll(recs))
    expect(s.totalPulls).toBe(563)
    expect(s.sDrops).toHaveLength(14)
    expect(s.currentPity).toBe(9)
    expect(s.sDrops.every((d) => d.pity <= 90)).toBe(true)
    expect(new Set(recs.map((r) => r.uid)).size).toBe(623)
  })
})

describe('assemble across banners', () => {
  const row = (ticks: bigint, banner: string) => ({ roll: 1, reward: '1', items: [], source: 'x', ticks, banner })
  it('keeps standard and event pages with the same numbers apart', () => {
    const pages = [
      { struct: 'FMonopolyLotteryRecordData', stream: 'aa', page: 1, rows: [row(3n, 'Lottery_YeErMu'), row(2n, 'Lottery_YeErMu')] },
      { struct: 'FMonopolyLotteryRecordData', stream: 'aa', page: 2, rows: [row(1n, 'Lottery_YeErMu')] },
      { struct: 'FMonopolyLotteryRecordData', stream: 'aa', page: 1, rows: [row(9n, 'Lottery_Permanent')] },
      { struct: 'FMonopolyLotteryRecordData', stream: 'aa', page: 2, rows: [row(8n, 'Lottery_Permanent')] },
    ]
    const out = assemble(pages)
    expect(out.map((s) => s.length).sort()).toEqual([2, 3])
  })
})
