import { emptyRecords, POOL_IDS, type Profile, type SharedSnapshot } from './types'

/** Talks to the Cloudflare Pages Function in /functions/api/share. */
const API = '/api/share'

export function toSnapshot(p: Profile): SharedSnapshot {
  // Keep only what the shared page needs. No game UID, no share token.
  return { v: 1, name: p.name, region: p.region, records: p.records, updatedAt: new Date().toISOString() }
}

export class ShareUnavailable extends Error {}

async function call(path: string, init: RequestInit) {
  let res: Response
  try {
    res = await fetch(API + path, { ...init, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } })
  } catch {
    throw new Error('network')
  }
  // A static host without the function answers 404/405 or HTML.
  const type = res.headers.get('content-type') ?? ''
  if (!type.includes('application/json')) throw new ShareUnavailable()
  const body = await res.json()
  if (!res.ok) throw new Error(body?.error ?? 'server')
  return body
}

export async function createShare(p: Profile): Promise<{ id: string; token: string }> {
  return call('', { method: 'POST', body: JSON.stringify(toSnapshot(p)) })
}

export async function updateShare(id: string, token: string, p: Profile) {
  return call('/' + id, { method: 'PUT', body: JSON.stringify(toSnapshot(p)), headers: { authorization: `Bearer ${token}` } })
}

export async function deleteShare(id: string, token: string) {
  return call('/' + id, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } })
}

export async function fetchShare(id: string): Promise<SharedSnapshot | null> {
  const res = await fetch(`${API}/${encodeURIComponent(id)}`)
  if (res.status === 404) return null
  const type = res.headers.get('content-type') ?? ''
  if (!res.ok || !type.includes('application/json')) throw new ShareUnavailable()
  const data = await res.json()
  // Never trust the shape of what comes back: rebuild the parts we render.
  const records = emptyRecords()
  for (const pool of POOL_IDS) {
    const rows = data?.records?.[pool]
    if (Array.isArray(rows)) records[pool] = rows.filter((r: unknown) => r && typeof r === 'object' && typeof (r as { uid?: unknown }).uid === 'string')
  }
  return { v: 1, name: String(data?.name ?? '').slice(0, 40), region: typeof data?.region === 'string' ? data.region : undefined, records, updatedAt: String(data?.updatedAt ?? '') }
}

export function shareUrl(id: string) {
  return `${location.origin}${location.pathname}#/u/${id}`
}
