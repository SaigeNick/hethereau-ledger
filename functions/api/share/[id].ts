import { json, overLimit, readSnapshot, sha256, type Env, type Stored } from './_shared'

async function load(env: Env, id: string) {
  if (!/^[a-z2-9]{8}$/.test(id)) return null
  const raw = await env.SHARES.get(`p:${id}`)
  return raw ? (JSON.parse(raw) as Stored) : null
}

async function authorized(request: Request, stored: Stored) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  return token.length > 0 && (await sha256(token)) === stored.tokenHash
}

// GET /api/share/:id — public read.
export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const stored = await load(env, String(params.id))
  if (!stored) return json({ error: 'not_found' }, 404)
  return json(stored.data)
}

// PUT /api/share/:id — owner replaces the snapshot.
export const onRequestPut: PagesFunction<Env> = async ({ params, env, request }) => {
  const id = String(params.id)
  const stored = await load(env, id)
  if (!stored) return json({ error: 'not_found' }, 404)
  if (!(await authorized(request, stored))) return json({ error: 'forbidden' }, 403)
  if (await overLimit(env, request, 60)) return json({ error: 'rate_limited' }, 429)
  const snap = await readSnapshot(request)
  if ('error' in snap) return json({ error: snap.error }, 400)
  await env.SHARES.put(`p:${id}`, JSON.stringify({ ...stored, data: snap.data, updatedAt: snap.data.updatedAt }))
  return json({ ok: true })
}

// DELETE /api/share/:id — owner removes the link.
export const onRequestDelete: PagesFunction<Env> = async ({ params, env, request }) => {
  const id = String(params.id)
  const stored = await load(env, id)
  if (!stored) return json({ error: 'not_found' }, 404)
  if (!(await authorized(request, stored))) return json({ error: 'forbidden' }, 403)
  await env.SHARES.delete(`p:${id}`)
  return json({ ok: true })
}
