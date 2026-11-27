import { json, overLimit, randomId, readSnapshot, sha256, type Env, type Stored } from './_shared'

// POST /api/share — store a snapshot, return its id and an edit token.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (await overLimit(env, request)) return json({ error: 'rate_limited' }, 429)
  const snap = await readSnapshot(request)
  if ('error' in snap) return json({ error: snap.error }, 400)
  const id = randomId(8)
  const token = randomId(32)
  const stored: Stored = { tokenHash: await sha256(token), data: snap.data, updatedAt: snap.data.updatedAt }
  await env.SHARES.put(`p:${id}`, JSON.stringify(stored))
  return json({ id, token }, 201)
}
