import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AppNavigation from '../components/AppNavigation'
import { track } from '../services/analytics'
import MobileBottomNav from '../components/MobileBottomNav'
import AuthModal from '../components/AuthModal'
import FeedbackModal from '../components/FeedbackModal'
import './PageLayout.css'

export default function PageLayout() {
  const location = useLocation()
  const isFacade =
    location.pathname === '/' ||
    location.pathname === '' ||
    location.pathname === '/index.html'

  // 页面浏览埋点：放这一处即可覆盖所有路由（含首页）。
  // UTM 归因在 analytics.js 里抓，自媒体链接带不带参数都能对上。
  useEffect(() => {
    track('page_view', { facade: isFacade })
  }, [location.pathname, isFacade])

  return (
    <div className={`page-layout ${isFacade ? 'page-layout--facade' : ''}`}>
      {!isFacade && <AppNavigation />}

      <main className="page-main">
        <div key={location.pathname} className="page-transition">
          <Outlet />
        </div>
      </main>

      {!isFacade && <MobileBottomNav />}

      <AuthModal />
      <FeedbackModal />
    </div>
  )
}
