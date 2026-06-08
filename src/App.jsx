import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import MainLayout from './layouts/MainLayout'
import HomePage from './pages/HomePage'
import SolidGeometryPage from './pages/SolidGeometryPage'
import PlaceholderPage from './pages/PlaceholderPage'

// GitHub Pages 生产环境 base 路径
const basename = import.meta.env.MODE === 'production' ? '/geometry-3d-learning/' : '/'

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'geometry-3d', element: <SolidGeometryPage /> },
      { path: 'geometry-2d', element: <PlaceholderPage /> },
      { path: 'functions', element: <PlaceholderPage /> },
      { path: 'vectors', element: <PlaceholderPage /> },
      { path: 'analytic-geometry', element: <PlaceholderPage /> },
      { path: 'statistics', element: <PlaceholderPage /> },
      { path: 'toolbox', element: <PlaceholderPage /> },
    ],
  },
], { basename })

export default function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  )
}
