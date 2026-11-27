import { useEffect } from 'react'
import { updateShare } from './share'
import { useStore } from './store'
import { POOL_IDS, type Profile } from './types'

/** Cheap fingerprint of a profile's shared content. */
export function shareSig(p: Profile) {
  return [p.name, p.region ?? '', ...POOL_IDS.map((id) => `${p.records[id].length}:${p.records[id].reduce((m, r) => (r.time > m ? r.time : m), '')}`)].join('|')
}

/** Keeps the active profile's share link in step with its history, so other devices see new pulls. */
export function useAutoShare() {
  const { active, updateProfile } = useStore()
  const sig = shareSig(active)
  const share = active.share
  useEffect(() => {
    if (!share || share.sig === sig) return
    const timer = setTimeout(() => {
      updateShare(share.id, share.token, active)
        .then(() => updateProfile(active.id, { share: { ...share, sig, updatedAt: new Date().toISOString() } }))
        .catch(() => {
          /* offline or limit reached: try again on the next change */
        })
    }, 3000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, share?.id, share?.sig])
}
