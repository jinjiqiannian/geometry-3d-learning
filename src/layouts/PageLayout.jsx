import { Outlet, useLocation } from 'react-router-dom'
import AppNavigation from '../components/AppNavigation'
import MobileBottomNav from '../components/MobileBottomNav'
import './PageLayout.css'

/**
 * 自用版布局：导航 + 页面主体。
 * 已移除登录弹窗、反馈弹窗与 page_view 埋点 —— 本地使用没有上报对象，
 * 留着只会对 /api/track 发出必然失败的请求。
 */
export default function PageLayout() {
  const location = useLocation()

  return (
    <div className="page-layout">
      <AppNavigation />

      <main className="page-main">
        <div key={location.pathname} className="page-transition">
          <Outlet />
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
