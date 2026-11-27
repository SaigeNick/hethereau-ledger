import { useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { hasAnyRecords, OverviewBody } from '../components/PoolViews'
import { loadDemo } from '../lib/demoLoader'
import { useI18n } from '../lib/i18n'
import { useStore } from '../lib/store'

export function OverviewPage() {
  const { t } = useI18n()
  const { active } = useStore()

  if (!hasAnyRecords(active.records)) {
    return (
      <div className="empty">
        <h1>{t('overview.empty.title')}</h1>
        <p className="lead">{t('overview.empty.body')}</p>
        <div className="actions">
          <Link className="btn" to="/import">
            {t('overview.empty.import')}
          </Link>
          <Link className="btn btn--ghost" to="/guide">
            {t('nav.guide')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <h1 className="page-title">{active.name || t('overview.title')}</h1>
      <OverviewBody records={active.records} base="" />
    </>
  )
}

/** Hidden route for testing with sample data: #/demo */
export function DemoPage() {
  const store = useStore()
  useEffect(() => {
    loadDemo(store)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <Navigate to="/" replace />
}
