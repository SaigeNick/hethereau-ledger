import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BannerBody, OverviewBody } from '../components/PoolViews'
import { useI18n } from '../lib/i18n'
import { fetchShare } from '../lib/share'
import { POOL_IDS, type PoolId, type SharedSnapshot } from '../lib/types'

const cache = new Map<string, SharedSnapshot | null>()

export function SharedPage() {
  const { shareId = '', poolId } = useParams()
  const { t, fmtDate } = useI18n()
  const [snap, setSnap] = useState<SharedSnapshot | null | undefined>(cache.get(shareId))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (cache.has(shareId)) return
    fetchShare(shareId)
      .then((s) => {
        cache.set(shareId, s)
        setSnap(s)
      })
      .catch(() => setFailed(true))
  }, [shareId])

  if (failed || snap === null) return <p className="lead">{t('shared.missing')}</p>
  if (snap === undefined) return <p className="lead muted">{t('shared.loading')}</p>

  const base = `/u/${shareId}`
  const header = (
    <div className="shared-head">
      <h1 className="page-title">{snap.name || t('profile.unnamed')}</h1>
      <p className="muted">
        {t('shared.updated', { date: fmtDate(snap.updatedAt) })} · <Link to="/import">{t('shared.own')}</Link>
      </p>
    </div>
  )

  if (poolId && POOL_IDS.includes(poolId as PoolId)) {
    return <BannerBody pool={poolId as PoolId} records={snap.records[poolId as PoolId]} base={base} />
  }
  return (
    <>
      {header}
      <OverviewBody records={snap.records} base={base} />
    </>
  )
}
