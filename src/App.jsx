import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { SupabaseProvider } from './contexts/SupabaseContext'
import { SubscriptionProvider } from './contexts/SubscriptionContext'
import { AppProvider } from './contexts/AppContext'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import { TeacherProvider } from './contexts/TeacherContext'
import PageLayout from './layouts/PageLayout'
import LandingPage from './pages/LandingPage'
import ErrorBoundary from './components/ErrorBoundary'

// ── Route-level code splitting ──
// Three.js, pptExporter, and heavy engines only load when needed
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

// ── Suspense fallback ──
function PageLoader() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 200,
      color: 'var(--text-muted)',
      fontSize: 'var(--text-sm)',
    }}>
      加载中…
    </div>
  )
}

function WrappedRoute({ children }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

// GitHub Pages / 自定义域名 base 路径
// - jiheweidu.cn → 自定义域名，根路径
// - jinjiqiannian.github.io → GitHub Pages 子路径
// - localhost → 开发环境，根路径
function getBasename() {
  if (typeof window === 'undefined') return '/'
  const host = window.location.hostname
  if (host === 'jiheweidu.cn' || host === 'localhost' || host === '127.0.0.1') return '/'
  if (host === 'jinjiqiannian.github.io') return '/geometry-3d-learning/'
  return '/'
}
const basename = getBasename()

const router = createBrowserRouter([
  {
    path: '/',
    element: <PageLayout />,
    children: [
      { index: true, element: <WrappedRoute><LandingPage /></WrappedRoute> },
      { path: 'workspace', element: <WrappedRoute><WorkspacePage /></WrappedRoute> },
      { path: 'pricing', element: <WrappedRoute><PricingPage /></WrappedRoute> },
      { path: 'history', element: <WrappedRoute><HistoryPage /></WrappedRoute> },
      { path: 'settings', element: <WrappedRoute><SettingsPage /></WrappedRoute> },
    ],
  },
], { basename })

export default function App() {
  return (
    <SupabaseProvider>
      <SubscriptionProvider>
        <AppProvider>
          <WorkspaceProvider>
            <TeacherProvider>
              <RouterProvider router={router} />
            </TeacherProvider>
          </WorkspaceProvider>
        </AppProvider>
      </SubscriptionProvider>
    </SupabaseProvider>
  )
}
