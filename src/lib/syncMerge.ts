import { mergeRecords } from './importer'
import { emptyRecords, POOL_IDS, type Profile, type StoreState } from './types'

/**
 * Merges two copies of the store (this device and the cloud copy).
 * Pulls are united by uid; anything deleted on either side stays deleted.
 * Profiles match by id, then by game UID, then by the share link they were copied from.
 */
export function mergeStates(local: StoreState, remote: StoreState): StoreState {
  const tomb = {
    profiles: [...new Set([...(local.tombstones?.profiles ?? []), ...(remote.tombstones?.profiles ?? [])])].slice(-500),
    records: [...new Set([...(local.tombstones?.records ?? []), ...(remote.tombstones?.records ?? [])])].slice(-20000),
  }
  const deadProfiles = new Set(tomb.profiles)
  const deadRecords = new Set(tomb.records)

  const profiles: Profile[] = local.profiles.map((p) => ({ ...p, records: { ...emptyRecords(), ...p.records } }))
  for (const r of remote.profiles) {
    const i = profiles.findIndex(
      (p) =>
        p.id === r.id ||
        (!!p.gameUid && p.gameUid === r.gameUid) ||
        (!!p.source && (p.source === r.source || p.source === r.share?.id)) ||
        (!!p.share && p.share.id === r.source),
    )
    if (i < 0) {
      profiles.push({ ...r, records: { ...emptyRecords(), ...r.records } })
      continue
    }
    const l = profiles[i]
    const newer = r.updatedAt > l.updatedAt ? r : l
    const records = { ...l.records }
    for (const pool of POOL_IDS) records[pool] = mergeRecords(l.records[pool] ?? [], r.records?.[pool] ?? []).records
    profiles[i] = {
      ...l,
      name: newer.name,
      region: newer.region ?? l.region ?? r.region,
      avatar: newer.avatar ?? l.avatar ?? r.avatar,
      gameUid: l.gameUid ?? r.gameUid,
      share: l.share ?? r.share,
      source: l.source ?? r.source,
      records,
      // A checklist: a tick on either device counts.
      achievements: [...new Set([...(l.achievements ?? []), ...(r.achievements ?? [])])],
      collection: newer.collection ?? l.collection ?? r.collection,
      updatedAt: newer.updatedAt,
    }
  }

  const alive = profiles
    .filter((p) => !deadProfiles.has(p.id))
    .map((p) => {
      const records = { ...p.records }
      for (const pool of POOL_IDS) records[pool] = records[pool].filter((r) => !deadRecords.has(r.uid))
      return { ...p, records }
    })
    // Drop untouched starter profiles when real ones exist.
    .filter((p, _, all) => all.length === 1 || p.name || p.gameUid || p.source || POOL_IDS.some((id) => p.records[id].length))

  const final = alive.length ? alive : local.profiles.slice(0, 1)
  return {
    version: 1,
    activeId: final.some((p) => p.id === local.activeId) ? local.activeId : final[0].id,
    profiles: final,
    tombstones: tomb,
  }
}

/** Content fingerprint, to skip uploads and re-renders when nothing changed. */
export function stateSig(s: StoreState) {
  return JSON.stringify([
    s.profiles.map((p) => [p.id, p.name, p.region, p.avatar, p.gameUid, p.source, p.share?.id, (p.achievements ?? []).length, JSON.stringify(p.collection ?? {}), POOL_IDS.map((id) => p.records[id].map((r) => r.uid).join())]),
    s.tombstones?.profiles.length ?? 0,
    s.tombstones?.records.length ?? 0,
  ])
}
