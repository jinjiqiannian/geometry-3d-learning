import { Outlet, useLocation } from 'react-router-dom'
import AppNavigation from '../components/AppNavigation'
import MobileBottomNav from '../components/MobileBottomNav'
import PaywallModal from '../components/PaywallModal'
import AuthModal from '../components/AuthModal'
import FeedbackModal from '../components/FeedbackModal'
import './PageLayout.css'

export default function PageLayout() {
  const location = useLocation()
  const isLandingPage = location.pathname === '/'

  return (
    <div className="page-layout">
      {!isLandingPage && <AppNavigation />}

      <main className="page-main">
        <div key={location.pathname} className="page-transition">
          <Outlet />
        </div>
      </main>

      {!isLandingPage && <MobileBottomNav />}

      {/* Global modals — render based on context state */}
      <PaywallModal />
      <AuthModal />
      <FeedbackModal />
    </div>
  )
}
