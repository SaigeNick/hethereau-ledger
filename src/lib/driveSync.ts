import { useCallback, useEffect, useRef, useState } from 'react'
import { download, driveAvailable, driveFlag, hasToken, setDriveFlag, signIn, upload } from './drive'
import { useStore } from './store'
import { mergeStates, stateSig } from './syncMerge'

export type DriveStatus = 'off' | 'idle' | 'syncing' | 'error' | 'needsSignIn'

/** One shared sync state for the whole app. */
const listeners = new Set<() => void>()
let status: DriveStatus = driveAvailable() && driveFlag().on ? 'needsSignIn' : 'off'
let lastError = ''
const setStatus = (s: DriveStatus, err = '') => {
  status = s
  lastError = err
  listeners.forEach((l) => l())
}

export function useDriveSync() {
  const store = useStore()
  const [, force] = useState(0)
  const stateRef = useRef(store.state)
  stateRef.current = store.state
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => void listeners.delete(l)
  }, [])

  const syncNow = useCallback(
    async (interactive: boolean) => {
      if (!driveAvailable()) return
      try {
        if (!hasToken()) {
          if (!interactive) return setStatus('needsSignIn')
          await signIn()
        }
        setStatus('syncing')
        const local = stateRef.current
        const remote = await download()
        const merged = remote ? mergeStates(local, remote) : local
        if (stateSig(merged) !== stateSig(local)) store.replaceAll(merged)
        if (!remote || stateSig(merged) !== stateSig(remote)) await upload(merged)
        setDriveFlag({ on: true, lastSync: new Date().toISOString() })
        setStatus('idle')
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'error'
        setStatus(msg === 'no_token' ? 'needsSignIn' : 'error', msg)
      }
    },
    [store],
  )
  return { status, lastError, flag: driveFlag(), syncNow }
}

/** After local changes, push them to Drive while this session still has a token. */
export function useDriveAutoSync() {
  const { state } = useStore()
  const { syncNow } = useDriveSync()
  const sig = stateSig(state)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (!driveAvailable() || !driveFlag().on || !hasToken() || status === 'syncing') return
    const t = setTimeout(() => void syncNow(false), 4000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])
}

export { setStatus as _setDriveStatus }
