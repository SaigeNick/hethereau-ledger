import { GOOGLE_CLIENT_ID } from '../config'
import type { StoreState } from './types'

/**
 * Google Drive sync through the player's own hidden app folder (drive.appdata).
 * Everything runs in the browser: the token and the file never touch our server.
 */
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const FILE = 'hethereau-ledger.json'
const API = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'
const FLAG = 'hethereau-ledger.drive'

declare global {
  interface Window {
    google?: any
  }
}

export const driveAvailable = () => !!GOOGLE_CLIENT_ID

export interface DriveFlag {
  on: boolean
  lastSync?: string
}
export function driveFlag(): DriveFlag {
  try {
    return JSON.parse(localStorage.getItem(FLAG) ?? '{"on":false}')
  } catch {
    return { on: false }
  }
}
export function setDriveFlag(f: DriveFlag) {
  try {
    localStorage.setItem(FLAG, JSON.stringify(f))
  } catch {
    /* ignore */
  }
}

let gis: Promise<void> | null = null
function loadGis() {
  gis ??= new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve()
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      gis = null
      reject(new Error('gis_load'))
    }
    document.head.appendChild(s)
  })
  return gis
}

let token: { value: string; exp: number } | null = null
export const hasToken = () => !!token && token.exp > Date.now() + 60_000

/** Asks Google for a token. Must be called from a click (it may open a popup). */
export async function signIn(): Promise<void> {
  await loadGis()
  await new Promise<void>((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE,
      callback: (r: any) => {
        if (r.error || !r.access_token) return reject(new Error(r.error || 'denied'))
        token = { value: r.access_token, exp: Date.now() + Number(r.expires_in ?? 3600) * 1000 }
        resolve()
      },
      error_callback: (e: any) => reject(new Error(e?.type || 'popup')),
    })
    client.requestAccessToken({ prompt: '' })
  })
}

export function signOut() {
  if (token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(token.value, () => {})
  token = null
}

async function api(url: string, init: RequestInit = {}) {
  if (!hasToken()) throw new Error('no_token')
  const res = await fetch(url, { ...init, headers: { ...(init.headers ?? {}), authorization: `Bearer ${token!.value}` } })
  if (res.status === 401) {
    token = null
    throw new Error('no_token')
  }
  if (!res.ok) throw new Error('drive_' + res.status)
  return res
}

async function findFile(): Promise<string | null> {
  const q = encodeURIComponent(`name='${FILE}'`)
  const res = await api(`${API}?spaces=appDataFolder&q=${q}&fields=files(id)&pageSize=1`)
  const body = await res.json()
  return body.files?.[0]?.id ?? null
}

export async function download(): Promise<StoreState | null> {
  const id = await findFile()
  if (!id) return null
  const res = await api(`${API}/${id}?alt=media`)
  const data = await res.json()
  return data && data.version === 1 && Array.isArray(data.profiles) ? (data as StoreState) : null
}

export async function upload(state: StoreState) {
  const body = JSON.stringify(state)
  const id = await findFile()
  if (id) {
    await api(`${UPLOAD}/${id}?uploadType=media`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body })
    return
  }
  const boundary = 'hl' + Math.random().toString(36).slice(2)
  const meta = JSON.stringify({ name: FILE, parents: ['appDataFolder'], mimeType: 'application/json' })
  const multipart = `--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\ncontent-type: application/json\r\n\r\n${body}\r\n--${boundary}--`
  await api(`${UPLOAD}?uploadType=multipart`, { method: 'POST', headers: { 'content-type': `multipart/related; boundary=${boundary}` }, body: multipart })
}

export async function removeFile() {
  const id = await findFile()
  if (id) await api(`${API}/${id}`, { method: 'DELETE' })
}
