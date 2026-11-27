import { Navigate, useParams } from 'react-router-dom'
import { BannerBody } from '../components/PoolViews'
import { useStore } from '../lib/store'
import { POOL_IDS, type PoolId } from '../lib/types'

export function BannerPage() {
  const { poolId } = useParams()
  const { active, removeRecord } = useStore()
  if (!POOL_IDS.includes(poolId as PoolId)) return <Navigate to="/" replace />
  const pool = poolId as PoolId
  return <BannerBody pool={pool} records={active.records[pool]} base="" onDelete={(uid) => removeRecord(pool, uid)} />
}
