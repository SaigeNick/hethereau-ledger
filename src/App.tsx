import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { I18nProvider } from './lib/i18n'
import { StoreProvider } from './lib/store'
import { BannerPage } from './pages/BannerPage'
import { GuidePage } from './pages/GuidePage'
import { ImportPage } from './pages/ImportPage'
import { OverviewPage } from './pages/OverviewPage'
import { ProfilePage } from './pages/ProfilePage'
import { SharedPage } from './pages/SharedPage'

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <I18nProvider>
      <StoreProvider>
        <HashRouter>
          <ScrollTop />
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<OverviewPage />} />
              <Route path="pool/:poolId" element={<BannerPage />} />
              <Route path="import" element={<ImportPage />} />
              <Route path="guide" element={<GuidePage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="u/:shareId" element={<SharedPage />} />
              <Route path="u/:shareId/pool/:poolId" element={<SharedPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </StoreProvider>
    </I18nProvider>
  )
}
