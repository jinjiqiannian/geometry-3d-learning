import { Outlet, useLocation } from 'react-router-dom'
import AppNavigation from '../components/AppNavigation'
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
