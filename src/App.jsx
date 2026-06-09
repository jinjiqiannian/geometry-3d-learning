import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { SupabaseProvider } from './contexts/SupabaseContext'
import { SubscriptionProvider } from './contexts/SubscriptionContext'
import { AppProvider } from './contexts/AppContext'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import { TeacherProvider } from './contexts/TeacherContext'
import PageLayout from './layouts/PageLayout'
import LandingPage from './pages/LandingPage'
import WorkspacePage from './pages/WorkspacePage'
import PricingPage from './pages/PricingPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'

// GitHub Pages 生产环境 base 路径
const basename = import.meta.env.MODE === 'production' ? '/geometry-3d-learning/' : '/'

const router = createBrowserRouter([
  {
    path: '/',
    element: <PageLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'workspace', element: <WorkspacePage /> },
      { path: 'pricing', element: <PricingPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'settings', element: <SettingsPage /> },
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
