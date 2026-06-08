import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { SupabaseProvider } from './contexts/SupabaseContext'
import { SubscriptionProvider } from './contexts/SubscriptionContext'
import { AppProvider } from './contexts/AppContext'
import { TeacherProvider } from './contexts/TeacherContext'
import PageLayout from './layouts/PageLayout'
import LandingPage from './pages/LandingPage'
import WorkspacePage from './pages/WorkspacePage'
import PricingPage from './pages/PricingPage'

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
    ],
  },
], { basename })

export default function App() {
  return (
    <SupabaseProvider>
      <SubscriptionProvider>
        <AppProvider>
          <TeacherProvider>
            <RouterProvider router={router} />
          </TeacherProvider>
        </AppProvider>
      </SubscriptionProvider>
    </SupabaseProvider>
  )
}
