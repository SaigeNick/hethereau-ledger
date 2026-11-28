import { driveFlag, hasToken, removeFile, setDriveFlag, signIn, signOut } from './drive'
import { withdraw } from './globalStats'
import { deleteShare } from './share'
import type { Profile, StoreState } from './types'

const PREFIX = 'hethereau-ledger.'

/** Takes a profile off the server: its share link and its anonymous stats. Never throws. */
export async function forgetProfileOnline(p: Profile) {
  if (p.share) {
    try {
      await deleteShare(p.share.id, p.share.token)
    } catch {
      /* offline: the link stays until it is revoked again */
    }
  }
  await withdraw([p])
}

/**
 * Deletes everything the site keeps for this person: the Google Drive copy,
 * share links, anonymous stats and every local setting. Call it straight from
 * a click: Drive may need a sign-in popup, which browsers only allow then.
 * Returns whether the Drive copy could not be removed.
 */
export async function wipeEverything(state: StoreState): Promise<{ driveFailed: boolean }> {
  let driveFailed = false
  if (driveFlag().on) {
    try {
      if (!hasToken()) await signIn()
      await removeFile()
    } catch {
      driveFailed = true
    }
    signOut()
    setDriveFlag({ on: false })
  }
  for (const p of state.profiles) await forgetProfileOnline(p)
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith(PREFIX)) localStorage.removeItem(key)
  } catch {
    /* storage unavailable: nothing left to clear */
  }
  return { driveFailed }
}
