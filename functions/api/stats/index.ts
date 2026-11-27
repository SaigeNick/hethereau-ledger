import { json, overLimit, type Env } from '../share/_shared'

/**
 * Anonymous community stats for the limited character board.
 * Each player is one KV key holding only numbers in its metadata:
 * total pulls and the pity of each S. No names, UIDs or IPs.
 * Entries expire 180 days after the last update.
 */
const TTL = 180 * 86_400
const AGG_MAX_AGE = 600_000
const MAX_S = 200

interface Meta {
  p: number
  s: number[]
}
export interface Aggregate {
  players: number
  pulls: number
  sCount: number
  /** hist[i] = number of S drops at pity i+1 */
  hist: number[]
  /** Average S pity of every player with at least one S, sorted ascending. */
  avgs: number[]
  updatedAt: number
}

/** Preview deployments get their own keys so testing doesn't skew real stats. */
const prefix = (request: Request) => (new URL(request.url).hostname === 'hethereau-ledger.pages.dev' ? '' : 'pv:')

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (await overLimit(env, request, 30, 'st')) return json({ error: 'rate_limited' }, 429)
  let body: any
  try {
    const text = await request.text()
    if (text.length > 4000) return json({ error: 'too_large' }, 413)
    body = JSON.parse(text)
  } catch {
    return json({ error: 'bad_json' }, 400)
  }
  const key = String(body?.key ?? '')
  const pulls = Number(body?.pulls)
  const pities = Array.isArray(body?.pities) ? body.pities : null
  if (!/^[0-9a-f]{64}$/.test(key) || !Number.isInteger(pulls) || pulls < 1 || pulls > 50_000 || !pities) {
    return json({ error: 'bad_input' }, 400)
  }
  if (pities.length > MAX_S || !pities.every((n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 90)) {
    return json({ error: 'bad_input' }, 400)
  }
  const sum = pities.reduce((a: number, b: number) => a + b, 0)
  if (sum > pulls) return json({ error: 'bad_input' }, 400)
  const meta: Meta = { p: pulls, s: pities }
  await env.SHARES.put(`${prefix(request)}st:${key}`, '1', { metadata: meta, expirationTtl: TTL })
  await env.SHARES.delete(`${prefix(request)}stats:agg`)
  return new Response(null, { status: 204 })
}

/** Removes one player's numbers (used when they turn community stats off). */
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  if (await overLimit(env, request, 30, 'st')) return json({ error: 'rate_limited' }, 429)
  const key = new URL(request.url).searchParams.get('key') ?? ''
  if (!/^[0-9a-f]{64}$/.test(key)) return json({ error: 'bad_input' }, 400)
  await env.SHARES.delete(`${prefix(request)}st:${key}`)
  await env.SHARES.delete(`${prefix(request)}stats:agg`)
  return new Response(null, { status: 204 })
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const pre = prefix(request)
  const cached = await env.SHARES.get<Aggregate>(`${pre}stats:agg`, 'json')
  if (cached && Date.now() - cached.updatedAt < AGG_MAX_AGE) return send(cached)

  const agg: Aggregate = { players: 0, pulls: 0, sCount: 0, hist: Array(90).fill(0), avgs: [], updatedAt: Date.now() }
  let cursor: string | undefined
  do {
    const page = await env.SHARES.list<Meta>({ prefix: `${pre}st:`, cursor })
    for (const k of page.keys) {
      const m = k.metadata
      if (!m || !Array.isArray(m.s)) continue
      agg.players++
      agg.pulls += m.p
      agg.sCount += m.s.length
      for (const p of m.s) agg.hist[p - 1]++
      if (m.s.length) agg.avgs.push(Math.round((m.s.reduce((a, b) => a + b, 0) / m.s.length) * 10) / 10)
    }
    cursor = page.list_complete ? undefined : (page as { cursor: string }).cursor
  } while (cursor)
  agg.avgs.sort((a, b) => a - b)
  await env.SHARES.put(`${pre}stats:agg`, JSON.stringify(agg))
  return send(agg)
}

function send(agg: Aggregate) {
  return new Response(JSON.stringify(agg), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60' },
  })
}
