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
      records: body.records,
      updatedAt: new Date().toISOString(),
    },
  }
}
