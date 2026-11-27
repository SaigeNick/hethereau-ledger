import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { mergeRecords, type ParsedExport } from './importer'
import { emptyRecords, POOL_IDS, type PoolId, type Profile, type PullRecord, type SharedSnapshot, type StoreState } from './types'

const KEY = 'hethereau-ledger.v1'
let askedPersist = false

export function newId(len = 8) {
  const a = new Uint8Array(len)
  crypto.getRandomValues(a)
  return Array.from(a, (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('')
}

function newProfile(name: string): Profile {
  return { id: newId(), name, records: emptyRecords(), updatedAt: new Date().toISOString() }
}

function load(): StoreState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw)
      if (isStoreState(s) && s.profiles.length) return s
    }
  } catch {
    /* storage can be blocked; start fresh */
  }
  const p = newProfile('')
  return { version: 1, activeId: p.id, profiles: [p] }
}

export interface ImportOutcome {
  pool: PoolId
  added: number
  duplicates: number
  profileId: string
  createdProfile: boolean
}

interface StoreApi {
  state: StoreState
  active: Profile
  saveFailed: boolean
  importParsed: (parsed: ParsedExport) => ImportOutcome
  addManual: (pool: PoolId, rows: PullRecord[]) => void
  removeRecord: (pool: PoolId, uid: string) => void
  clearPool: (pool: PoolId) => void
  updateProfile: (id: string, patch: Partial<Profile>) => void
  addProfile: (name: string) => void
  switchProfile: (id: string) => void
  deleteProfile: (id: string) => void
  replaceAll: (s: StoreState) => void
  /** Saves a shared profile on this device, or refreshes the copy made earlier. */
  adoptShare: (shareId: string, snap: SharedSnapshot) => string
}

const Ctx = createContext<StoreApi | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(load)
  const ref = useRef(state)
  const [saveFailed, setSaveFailed] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
      setSaveFailed(false)
      // Ask the browser not to evict this site's storage once there is history worth keeping.
      if (!askedPersist && state.profiles.some((p) => POOL_IDS.some((id) => p.records[id].length)) && navigator.storage?.persist) {
        askedPersist = true
        navigator.storage.persisted?.().then((done) => done || navigator.storage.persist()).catch(() => {})
      }
    } catch {
      setSaveFailed(true)
    }
  }, [state])

  const api = useMemo<StoreApi>(() => {
    const commit = (next: StoreState) => {
      ref.current = next
      setState(next)
    }
    const cur = () => ref.current
    const activeOf = (s: StoreState) => s.profiles.find((p) => p.id === s.activeId) ?? s.profiles[0]
    const patch = (id: string, fn: (p: Profile) => Profile) => {
      const s = cur()
      commit({ ...s, profiles: s.profiles.map((p) => (p.id === id ? { ...fn(p), updatedAt: new Date().toISOString() } : p)) })
    }

    return {
      state,
      active: activeOf(state),
      saveFailed,
      importParsed(parsed) {
        const s = cur()
        let profiles = s.profiles
        let target = activeOf(s)
        let created = false
        if (parsed.gameUid) {
          const owner = profiles.find((p) => p.gameUid === parsed.gameUid)
          if (owner) target = owner
          else if (target.gameUid) {
            // A different game account: give it its own profile.
            target = { ...newProfile(''), gameUid: parsed.gameUid }
            profiles = [...profiles, target]
            created = true
          }
        }
        const merged = mergeRecords(target.records[parsed.pool], parsed.records)
        const updated: Profile = {
          ...target,
          gameUid: target.gameUid ?? parsed.gameUid,
          region: parsed.region ?? target.region,
          records: { ...target.records, [parsed.pool]: merged.records },
          updatedAt: new Date().toISOString(),
        }
        commit({ ...s, activeId: updated.id, profiles: profiles.map((p) => (p.id === updated.id ? updated : p)) })
        return { pool: parsed.pool, added: merged.added, duplicates: merged.duplicates, profileId: updated.id, createdProfile: created }
      },
      addManual: (pool, rows) =>
        patch(activeOf(cur()).id, (p) => ({ ...p, records: { ...p.records, [pool]: mergeRecords(p.records[pool], rows).records } })),
      removeRecord: (pool, uid) =>
        patch(activeOf(cur()).id, (p) => ({ ...p, records: { ...p.records, [pool]: p.records[pool].filter((r) => r.uid !== uid) } })),
      clearPool: (pool) => patch(activeOf(cur()).id, (p) => ({ ...p, records: { ...p.records, [pool]: [] } })),
      updateProfile: (id, fields) => patch(id, (p) => ({ ...p, ...fields })),
      addProfile(name) {
        const s = cur()
        const p = newProfile(name)
        commit({ ...s, activeId: p.id, profiles: [...s.profiles, p] })
      },
      switchProfile: (id) => commit({ ...cur(), activeId: id }),
      deleteProfile(id) {
        const s = cur()
        const rest = s.profiles.filter((p) => p.id !== id)
        const profiles = rest.length ? rest : [newProfile('')]
        commit({ ...s, profiles, activeId: profiles.some((p) => p.id === s.activeId) ? s.activeId : profiles[0].id })
      },
      replaceAll: (s) => commit(s),
      adoptShare(shareId, snap) {
        const s = cur()
        const existing = s.profiles.find((p) => p.source === shareId)
        const records = { ...emptyRecords(), ...snap.records }
        const now = new Date().toISOString()
        if (existing) {
          const updated = { ...existing, name: snap.name || existing.name, region: snap.region, records, updatedAt: now }
          commit({ ...s, activeId: existing.id, profiles: s.profiles.map((p) => (p.id === existing.id ? updated : p)) })
          return existing.id
        }
        const p: Profile = { ...newProfile(snap.name), region: snap.region, records, source: shareId, updatedAt: now }
        // Replace the untouched starter profile instead of keeping an empty one around.
        const keep = s.profiles.filter((x) => x.name || x.gameUid || POOL_IDS.some((id) => x.records[id].length))
        commit({ ...s, activeId: p.id, profiles: [...keep, p] })
        return p.id
      },
    }
  }, [state, saveFailed])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('StoreProvider missing')
  return v
}

export function isStoreState(x: any): x is StoreState {
  return !!x && x.version === 1 && Array.isArray(x.profiles) && typeof x.activeId === 'string'
}
