import { Link } from 'react-router-dom'
import { hasAnyRecords, OverviewBody } from '../components/PoolViews'
import { demoFiles } from '../lib/demo'
import { useI18n } from '../lib/i18n'
import { parseExport } from '../lib/importer'
import { useStore } from '../lib/store'

export function loadDemo(store: ReturnType<typeof useStore>) {
  // Start the demo from scratch so it always shows the latest sample data.
  const old = store.state.profiles.find((p) => p.gameUid === 'demo')
  if (old) store.deleteProfile(old.id)
  let id = ''
  for (const f of demoFiles()) id = store.importParsed(parseExport(f)).profileId
  // Demo data lives in its own named profile, away from real accounts.
  if (id) store.updateProfile(id, { name: 'Demo' })
}

export function OverviewPage() {
  const { t } = useI18n()
  const store = useStore()
  const { active } = store

  if (!hasAnyRecords(active.records)) {
    return (
      <div className="empty">
        <h1>{t('overview.empty.title')}</h1>
        <p className="lead">{t('overview.empty.body')}</p>
        <div className="actions">
          <Link className="btn" to="/import">
            {t('overview.empty.import')}
          </Link>
          <button className="btn btn--ghost" onClick={() => loadDemo(store)}>
            {t('overview.empty.demo')}
          </button>
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
