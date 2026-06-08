import { Outlet } from 'react-router-dom'
import './PageLayout.css'

export default function PageLayout() {
  return (
    <div className="page-layout">
      <main className="page-main">
        <Outlet />
      </main>
    </div>
  )
}
