import { Outlet } from 'react-router-dom'
import AppNavigation from '../components/AppNavigation'
import MobileBottomNav from '../components/MobileBottomNav'
import './PageLayout.css'

export default function PageLayout() {
  return (
    <div className="page-layout">
      <AppNavigation />

      <main className="page-main">
        <Outlet />
      </main>

      <MobileBottomNav />
    </div>
  )
}
