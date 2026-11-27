import { POOL_IDS, type PoolId, type PoolRecords, type PullRecord, type Rank } from './types'

export interface ParsedExport {
  pool: PoolId
  gameUid?: string
  region?: string
  records: PullRecord[]
  warnings: string[]
  exporterVersion?: string
}

export class ImportError extends Error {
  code: 'not_json' | 'wrong_format' | 'unknown_pool' | 'no_records'
  constructor(code: ImportError['code']) {
    super(code)
    this.code = code
  }
}

const RANKS: Rank[] = ['S', 'A', 'B', 'C']

function toRank(v: unknown): Rank {
  const s = String(v ?? '').toUpperCase()
  return (RANKS as string[]).includes(s) ? (s as Rank) : '?'
}

/** Parse one file produced by NTE History Exporter (format "nte-history-export" v1). */
export function parseExport(text: string): ParsedExport {
  let doc: any
  try {
    doc = JSON.parse(text)
  } catch {
    throw new ImportError('not_json')
  }
  if (!doc || doc.format !== 'nte-history-export' || !Array.isArray(doc.records)) {
    throw new ImportError('wrong_format')
  }
  const pool = doc.banner?.id as PoolId
  if (!POOL_IDS.includes(pool)) throw new ImportError('unknown_pool')

  const records: PullRecord[] = []
  for (const r of doc.records) {
    if (!r || typeof r.uid !== 'string' || typeof r.timestamp !== 'string') continue
    const recPool = (POOL_IDS.includes(r.pool_group_id) ? r.pool_group_id : pool) as PoolId
    records.push({
      uid: r.uid,
      pool: recPool,
      time: r.timestamp,
      ord: Number.isFinite(r.timestamp_group_ordinal) ? r.timestamp_group_ordinal : 0,
      kind: r.result_type ?? (recPool === 'Arc_MiracleBox' ? 'arc' : 'single_pull'),
      rewardType: String(r.reward_type ?? 'item'),
      rewardId: String(r.reward_id ?? ''),
      name: String(r.reward_name || r.reward_id || '—'),
      rank: toRank(r.reward_rank),
      qty: typeof r.quantity === 'number' ? r.quantity : undefined,
      roll: typeof r.roll_result === 'number' ? r.roll_result : undefined,
    })
  }
  if (records.length === 0 && doc.records.length > 0) throw new ImportError('no_records')

  return {
    pool,
    gameUid: typeof doc.user_uid === 'string' && doc.user_uid !== 'optional-user-uid' ? doc.user_uid : undefined,
    region: typeof doc.account_region === 'string' ? doc.account_region : undefined,
    records,
    warnings: Array.isArray(doc.scan?.warnings) ? doc.scan.warnings.map(String) : [],
    exporterVersion: doc.exporter?.version,
  }
}

/**
 * Game time as the exporter writes it: the record's ticks read as UTC.
 * Sync used to convert to the browser's zone, which put the same pull
 * one or two hours away from its exporter copy.
 */
export function ticksToTime(t: bigint): string {
  const d = new Date(Number((t - 621_355_968_000_000_000n) / 10_000n))
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
}

/** Sync records carry their ticks in the uid: "<pool>:<ticks>:<ord>". */
const SYNC_UID = /^[A-Za-z_]+:(\d{15,}):\d+$/

/** Rewrites the time of sync records from their ticks, so old local-time rows line up with exporter rows. */
function fixTime(r: PullRecord): PullRecord {
  if (r.manual) return r
  const m = SYNC_UID.exec(r.uid)
  if (!m) return r
  const time = ticksToTime(BigInt(m[1]))
  return time === r.time ? r : { ...r, time }
}

/** One slot in the game's history: the same pull from the command and from the exporter shares it. */
function slotOf(r: PullRecord) {
  return r.manual ? `m:${r.uid}` : `${r.pool}|${r.time}|${r.ord}`
}

/** Keeps the newer copy, but holds on to what only the other one knows. */
function combine(old: PullRecord, next: PullRecord): PullRecord {
  return {
    ...old,
    ...next,
    // The sync uid comes back on every sync, so keep it as the one id.
    uid: SYNC_UID.test(old.uid) ? old.uid : next.uid,
    banner: next.banner ?? old.banner,
    rank: next.rank !== '?' ? next.rank : old.rank,
    name: next.name && next.name !== next.rewardId ? next.name : old.name || next.name,
  }
}

/** Fixes times and folds copies of the same pull into one. */
export function normalizeRecords(records: PullRecord[]): PullRecord[] {
  const map = new Map<string, PullRecord>()
  let changed = false
  for (const raw of records) {
    const r = fixTime(raw)
    if (r !== raw) changed = true
    const k = slotOf(r)
    const prev = map.get(k)
    if (prev) changed = true
    map.set(k, prev ? combine(prev, r) : r)
  }
  return changed ? sortChrono([...map.values()]) : records
}

export function normalizePools(records: PoolRecords): PoolRecords {
  const out = { ...records }
  for (const id of POOL_IDS) out[id] = normalizeRecords(out[id] ?? [])
  return out
}

/** Merge by slot (pool, time, order); incoming rows win so decoder fixes refresh names and ranks. */
export function mergeRecords(existing: PullRecord[], incoming: PullRecord[]) {
  const map = new Map(normalizeRecords(existing).map((r) => [slotOf(r), r]))
  let added = 0
  for (const raw of incoming) {
    const r = fixTime(raw)
    const k = slotOf(r)
    const prev = map.get(k)
    if (!prev) added++
    map.set(k, prev ? combine(prev, r) : r)
  }
  return { records: sortChrono([...map.values()]), added, duplicates: incoming.length - added }
}

/** Oldest first. Inside one timestamp, ordinal 0 is the newest row. */
export function sortChrono(records: PullRecord[]): PullRecord[] {
  return [...records].sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : b.ord - a.ord))
}
