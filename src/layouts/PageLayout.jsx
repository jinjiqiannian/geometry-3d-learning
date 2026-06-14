import { Outlet } from 'react-router-dom'
import AppNavigation from '../components/AppNavigation'
import MobileBottomNav from '../components/MobileBottomNav'
import PaywallModal from '../components/PaywallModal'
import AuthModal from '../components/AuthModal'
import FeedbackModal from '../components/FeedbackModal'
import './PageLayout.css'

export default function PageLayout() {
  return (
    <div className="page-layout">
      <AppNavigation />

      <main className="page-main">
        <Outlet />
      </main>

      <MobileBottomNav />

      {/* Global modals — render based on context state */}
      <PaywallModal />
      <AuthModal />
      <FeedbackModal />
    </div>
  )
}
