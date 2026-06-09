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

// GitHub Pages 生产环境 base 路径
const basename = import.meta.env.MODE === 'production' ? '/geometry-3d-learning/' : '/'

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
