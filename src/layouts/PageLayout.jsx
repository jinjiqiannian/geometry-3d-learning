import { Outlet } from 'react-router-dom'
import AppNavigation from '../components/AppNavigation'
import './PageLayout.css'

export default function PageLayout() {
  return (
    <div className="page-layout">
      <AppNavigation />

      <main className="page-main">
        <Outlet />
      </main>
    </div>
  )
}
