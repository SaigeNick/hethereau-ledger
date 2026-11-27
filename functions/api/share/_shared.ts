// Shared helpers for the share API (Cloudflare Pages Functions + KV).
export interface Env {
  SHARES: KVNamespace
}

export interface Stored {
  tokenHash: string
  data: unknown
  updatedAt: string
}

export const MAX_BYTES = 1_000_000
const POOLS = ['Lottery_LimitedCharacter', 'Lottery_Permanent', 'Arc_MiracleBox', 'Gashapon_MysteryBox']
const MAX_ROWS = 20_000

function str(v: unknown, max: number) {
  return typeof v === 'string' ? v.slice(0, max) : ''
}

/** Keeps only known fields with sane types and lengths; drops everything else. */
function cleanRecords(input: unknown) {
  const out: Record<string, unknown[]> = {}
  for (const pool of POOLS) {
    const rows = (input as Record<string, unknown>)?.[pool]
    if (!Array.isArray(rows)) {
      out[pool] = []
      continue
    }
    out[pool] = rows.slice(0, MAX_ROWS).flatMap((r: any) => {
      if (!r || typeof r !== 'object') return []
      return [
        {
          uid: str(r.uid, 96),
          pool,
          time: str(r.time, 32),
          ord: Number.isFinite(r.ord) ? Math.trunc(r.ord) : 0,
          kind: str(r.kind, 24),
          rewardType: str(r.rewardType, 24),
          rewardId: str(r.rewardId, 96),
          name: str(r.name, 96),
          rank: ['S', 'A', 'B', 'C'].includes(r.rank) ? r.rank : '?',
          qty: Number.isFinite(r.qty) ? Math.trunc(r.qty) : undefined,
          roll: Number.isFinite(r.roll) ? Math.trunc(r.roll) : undefined,
          manual: r.manual === true ? true : undefined,
          banner: r.banner ? str(r.banner, 64) : undefined,
        },
      ]
    })
  }
  return out
}

/** Simple per-IP limit on writes, so nobody can flood storage. */
export async function overLimit(env: Env, request: Request, max = 20) {
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown'
  const hour = Math.floor(Date.now() / 3_600_000)
  const key = `rl:${await sha256(ip)}:${hour}`
  const count = Number((await env.SHARES.get(key)) ?? '0')
  if (count >= max) return true
  await env.SHARES.put(key, String(count + 1), { expirationTtl: 3700 })
  return false
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

export async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function randomId(len: number) {
  const a = new Uint8Array(len)
  crypto.getRandomValues(a)
  return Array.from(a, (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('')
}

/** Accepts only the snapshot shape the site sends; drops anything else. */
export async function readSnapshot(request: Request) {
  const text = await request.text()
  if (text.length > MAX_BYTES) return { error: 'too_large' as const }
  let body: any
  try {
    body = JSON.parse(text)
  } catch {
    return { error: 'bad_json' as const }
  }
  if (!body || body.v !== 1 || typeof body.records !== 'object') return { error: 'bad_shape' as const }
  return {
    data: {
      v: 1,
      name: String(body.name ?? '').slice(0, 40),
      region: typeof body.region === 'string' ? body.region.slice(0, 8) : undefined,
      records: cleanRecords(body.records),
      updatedAt: new Date().toISOString(),
    },
  }
}
