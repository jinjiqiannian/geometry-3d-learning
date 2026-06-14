import { lazy, Suspense } from 'react'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { SupabaseProvider } from './contexts/SupabaseContext'
import { SubscriptionProvider } from './contexts/SubscriptionContext'
import { AppProvider } from './contexts/AppContext'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import { TeacherProvider } from './contexts/TeacherContext'
import { ThemeProvider } from './contexts/ThemeContext'
import PageLayout from './layouts/PageLayout'
import LandingPage from './pages/LandingPage'
import WorkspacePage from './pages/WorkspacePage'
import ErrorBoundary from './components/ErrorBoundary'
import ChunkErrorBoundary from './components/ChunkErrorBoundary'

// ── Route-level code splitting ──
// Three.js, pptExporter, and heavy engines only load when needed
const PricingPage = lazy(() => import('./pages/PricingPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const KnowledgeGraphPage = lazy(() => import('./pages/KnowledgeGraphPage'))
const MistakeBookPage = lazy(() => import('./pages/MistakeBookPage'))
const ProgressPage = lazy(() => import('./pages/ProgressPage'))

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
      <ChunkErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </ChunkErrorBoundary>
    </ErrorBoundary>
  )
}

const router = createHashRouter([
  {
    path: '/',
    element: <PageLayout />,
    children: [
      { index: true, element: <WrappedRoute><LandingPage /></WrappedRoute> },
      { path: 'workspace', element: <WrappedRoute><WorkspacePage /></WrappedRoute> },
      { path: 'pricing', element: <WrappedRoute><PricingPage /></WrappedRoute> },
      { path: 'history', element: <WrappedRoute><HistoryPage /></WrappedRoute> },
      { path: 'settings', element: <WrappedRoute><SettingsPage /></WrappedRoute> },
      { path: 'profile', element: <WrappedRoute><ProfilePage /></WrappedRoute> },
      { path: 'knowledge', element: <WrappedRoute><KnowledgeGraphPage /></WrappedRoute> },
      { path: 'mistakes', element: <WrappedRoute><MistakeBookPage /></WrappedRoute> },
      { path: 'progress', element: <WrappedRoute><ProgressPage /></WrappedRoute> },
    ],
  },
])

export default function App() {
  return (
    <ErrorBoundary>
      <SupabaseProvider>
        <SubscriptionProvider>
          <AppProvider>
            <WorkspaceProvider>
              <TeacherProvider>
                <ThemeProvider>
                  <RouterProvider router={router} />
                </ThemeProvider>
              </TeacherProvider>
            </WorkspaceProvider>
          </AppProvider>
        </SubscriptionProvider>
      </SupabaseProvider>
    </ErrorBoundary>
  )
}
