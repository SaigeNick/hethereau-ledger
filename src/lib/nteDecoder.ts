import type { PoolId, PullRecord } from './types'

/**
 * Decodes pull history from the game's own network packets.
 *
 * The sync command captures raw inbound UDP payloads and hands them to the
 * site untouched, so all protocol knowledge lives here and ships with the
 * site: a game patch is fixed once, and nobody has to update the command.
 *
 * Format notes (from captures): the game serialises a bit stream, so the
 * history arrives at an arbitrary bit offset inside a packet. Realigned, it is
 * a plain Unreal struct array:
 *
 *   FString "FMonopolyLotteryRecordData"
 *   u32 ?, u32 ?, u32 count
 *   count x {
 *     i32     roll        1..6 dice, 0 = every-10 bonus, -1 = chase bonus
 *     FString reward      "1033" or "Dice_ticket_02,30" (id[,quantity])
 *     i32     ?
 *     TArray<FString> items   every item granted, extras like Warp Pieces
 *     FString source      "CardPool_Character"
 *     i64     ticks       .NET ticks, UTC
 *     FString banner      "Lottery_YeErMu" (the exact banner)
 *   }
 *
 * The page number sits in the envelope just before the struct name.
 */

const enc = new TextEncoder()
const STRUCTS = [{ name: 'FMonopolyLotteryRecordData', kind: 'monopoly' as const }]
const NEEDLES = STRUCTS.map((s) => ({ ...s, bytes: enc.encode(s.name + '\0') }))

export interface RawRow {
  roll: number
  reward: string
  items: string[]
  source: string
  ticks: bigint
  banner: string
}

export interface DecodedPage {
  struct: string
  stream: string
  page: number | null
  rows: RawRow[]
}

/** Drops the first k bits of a little-endian bit stream. */
export function shiftBits(b: Uint8Array, k: number): Uint8Array {
  if (k === 0) return b
  const out = new Uint8Array(b.length)
  for (let i = 0; i < b.length; i++) out[i] = ((b[i] >> k) | ((b[i + 1] ?? 0) << (8 - k))) & 0xff
  return out
}

function indexOf(hay: Uint8Array, needle: Uint8Array, from = 0): number {
  outer: for (let i = from; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer
    return i
  }
  return -1
}

class Reader {
  o: number
  v: DataView
  b: Uint8Array
  constructor(b: Uint8Array, o: number) {
    this.b = b
    this.o = o
    this.v = new DataView(b.buffer, b.byteOffset, b.byteLength)
  }
  i32() {
    const x = this.v.getInt32(this.o, true)
    this.o += 4
    return x
  }
  i64() {
    const x = this.v.getBigInt64(this.o, true)
    this.o += 8
    return x
  }
  str() {
    const n = this.i32()
    if (n < 0 || n > 256) throw new Error('bad string length')
    if (n === 0) return ''
    const raw = this.b.subarray(this.o, this.o + n)
    this.o += n
    if (raw.length < n || raw[n - 1] !== 0) throw new Error('unterminated string')
    let s = ''
    for (let i = 0; i < n - 1; i++) {
      const c = raw[i]
      if (c < 32 || c > 126) throw new Error('not ascii')
      s += String.fromCharCode(c)
    }
    return s
  }
}

const TICKS_MIN = 638_800_000_000_000_000n // 2025
const TICKS_MAX = 640_500_000_000_000_000n // 2030

/** Finds and parses every history page inside one packet. */
export function decodePacket(payload: Uint8Array): DecodedPage[] {
  const pages: DecodedPage[] = []
  for (let k = 0; k < 8; k++) {
    const s = shiftBits(payload, k)
    for (const st of NEEDLES) {
      let j = indexOf(s, st.bytes)
      while (j >= 0) {
        try {
          const r = new Reader(s, j + st.bytes.length)
          r.i32()
          r.i32()
          const count = r.i32()
          if (count < 0 || count > 100) throw new Error('bad count')
          const rows: RawRow[] = []
          for (let n = 0; n < count; n++) {
            const roll = r.i32()
            const reward = r.str()
            r.i32()
            const itemCount = r.i32()
            if (itemCount < 0 || itemCount > 20) throw new Error('bad items')
            const items = Array.from({ length: itemCount }, () => r.str())
            const source = r.str()
            const ticks = r.i64()
            if (ticks < TICKS_MIN || ticks > TICKS_MAX) throw new Error('bad time')
            const banner = r.str()
            rows.push({ roll, reward, items, source, ticks, banner })
          }
          let page: number | null = null
          let stream = ''
          if (j >= 23) {
            const v = new DataView(s.buffer, s.byteOffset)
            const raw = v.getUint32(j - 19, true)
            const p = raw >>> 7
            if ((raw & 0x7f) === 0 && p > 0 && p < 100000) page = p
            stream = Array.from(s.subarray(j - 23, j - 19), (x) => x.toString(16).padStart(2, '0')).join('')
          }
          pages.push({ struct: st.name, stream, page, rows })
        } catch {
          /* not a real record block at this alignment */
        }
        j = indexOf(s, st.bytes, j + 1)
      }
    }
  }
  return pages
}

function rowKey(r: RawRow) {
  return `${r.ticks}|${r.roll}|${r.reward}|${r.banner}`
}

/**
 * Orders pages into one newest-first history per stream. Pages fetched twice
 * keep the latest copy. Without page numbers, falls back to content order.
 */
export function assemble(pages: DecodedPage[]): RawRow[][] {
  const streams = new Map<string, Map<number, RawRow[]>>()
  const loose: RawRow[][] = []
  for (const p of pages) {
    if (p.rows.length === 0) continue
    if (p.page === null) {
      loose.push(p.rows)
      continue
    }
    const key = `${p.struct}|${p.stream}`
    if (!streams.has(key)) streams.set(key, new Map())
    streams.get(key)!.set(p.page, p.rows)
  }
  const out: RawRow[][] = []
  for (const m of streams.values()) {
    out.push([...m.keys()].sort((a, b) => a - b).flatMap((k) => m.get(k)!))
  }
  if (loose.length) {
    // Dedupe identical pages and order them by their newest row.
    const seen = new Set<string>()
    const uniq = loose.filter((rows) => {
      const sig = rows.map(rowKey).join(',')
      if (seen.has(sig)) return false
      seen.add(sig)
      return true
    })
    uniq.sort((a, b) => (a[0].ticks > b[0].ticks ? -1 : 1))
    out.push(uniq.flat())
  }
  return out
}

/** .NET ticks (UTC) to the viewer's local "YYYY-MM-DD HH:mm:ss". */
export function ticksToLocal(t: bigint): string {
  const ms = Number((t - 621_355_968_000_000_000n) / 10_000n)
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function poolOf(banner: string): PoolId {
  return banner === 'Lottery_Permanent' ? 'Lottery_Permanent' : 'Lottery_LimitedCharacter'
}

/** Turns an assembled newest-first stream into tracker records. */
export function toRecords(rows: RawRow[]): PullRecord[] {
  const out: PullRecord[] = []
  let lastTicks: bigint | null = null
  let ord = 0
  for (const r of rows) {
    ord = r.ticks === lastTicks ? ord + 1 : 0
    lastTicks = r.ticks
    const [id, qtyText] = r.reward.split(',')
    const pool = poolOf(r.banner)
    out.push({
      uid: `${pool}:${r.ticks}:${ord}`,
      pool,
      time: ticksToLocal(r.ticks),
      ord,
      kind: r.roll > 0 ? 'dice' : r.roll === 0 ? 'points_gift' : 'chase_reward',
      rewardType: 'item',
      rewardId: id,
      name: id,
      rank: '?',
      qty: qtyText ? Number(qtyText) || 1 : 1,
      roll: r.roll > 0 ? r.roll : undefined,
      banner: r.banner,
    })
  }
  return out
}

/** Full pipeline: packets in, records per pool out. */
export function decodePackets(packets: Uint8Array[]): Record<PoolId, PullRecord[]> {
  const pages = packets.flatMap(decodePacket)
  const result = {} as Record<PoolId, PullRecord[]>
  for (const stream of assemble(pages)) {
    for (const rec of toRecords(stream)) (result[rec.pool] ??= []).push(rec)
  }
  return result
}

/** "HL1:" + base64(gzip(frames)), frame = u32 length + payload. */
export async function unpackSync(text: string): Promise<Uint8Array[]> {
  const body = text.trim().replace(/^HL1:/, '').replace(/\s+/g, '')
  const bin = Uint8Array.from(atob(body), (c) => c.charCodeAt(0))
  const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))
  const raw = new Uint8Array(await new Response(stream).arrayBuffer())
  const v = new DataView(raw.buffer)
  const frames: Uint8Array[] = []
  let o = 0
  while (o + 4 <= raw.length) {
    const n = v.getUint32(o, true)
    o += 4
    if (n > raw.length - o) break
    frames.push(raw.subarray(o, o + n))
    o += n
  }
  return frames
}

export function looksLikeSync(text: string) {
  return /^\s*HL1:[A-Za-z0-9+/=\s]+$/.test(text)
}
