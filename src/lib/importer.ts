import { POOL_IDS, type PoolId, type PullRecord, type Rank } from './types'

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

/** Merge by uid; incoming rows win so decoder fixes refresh names and ranks. */
export function mergeRecords(existing: PullRecord[], incoming: PullRecord[]) {
  const map = new Map(existing.map((r) => [r.uid, r]))
  let added = 0
  for (const r of incoming) {
    if (!map.has(r.uid)) added++
    map.set(r.uid, r)
  }
  return { records: sortChrono([...map.values()]), added, duplicates: incoming.length - added }
}

/** Oldest first. Inside one timestamp, ordinal 0 is the newest row. */
export function sortChrono(records: PullRecord[]): PullRecord[] {
  return [...records].sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : b.ord - a.ord))
}
