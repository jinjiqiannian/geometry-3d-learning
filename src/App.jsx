import { lazy, Suspense, useEffect, useState } from 'react';
import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom';
import { SupabaseProvider } from './contexts/SupabaseContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { ThemeProvider } from './contexts/ThemeContext';
import PageLayout from './layouts/PageLayout';
import ErrorBoundary from './components/ErrorBoundary';
import ChunkErrorBoundary from './components/ChunkErrorBoundary';

// ── Route-level code splitting ──
// Three.js and heavy engines only load when needed
const HomePage = lazy(() => import('./pages/HomePage'));
const MaterialsPage = lazy(() => import('./pages/MaterialsPage'));
const TeachPage = lazy(() => import('./pages/TeachPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));

// ── Suspense fallback ──
// 延迟 160ms 才现身：chunk 已在缓存里的快路由不会闪任何东西。
// 超时才显示转圈，转场因此是连续的而不是「文字一闪 → 页面」。
function PageLoader() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 160);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`page-loader ${visible ? 'page-loader--visible' : ''}`}
      role="status"
      aria-label="加载中"
    >
      <span className="page-loader-spinner" aria-hidden="true" />
    </div>
  );
}

function WrappedRoute({ children }) {
  return (
    <ErrorBoundary>
      <ChunkErrorBoundary>
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </ChunkErrorBoundary>
    </ErrorBoundary>
  );
}

/**
 * 个人自用版的路由：
 *   /          首页（今日作文素材 + 功能入口）
 *   /materials 素材库，按作文方向筛选
 *   /search    搜题解题
 *   /teach     知识点讲解
 *   /explore   3D 探索台
 *
 * 营销页、登录、订阅、个人中心、设置、历史、反馈后台、ExamMind
 * 等面向公众/多用户的页面已删除。未知路径兜底回首页。
 */
const router = createHashRouter([
  {
    path: '/',
    element: <PageLayout />,
    children: [
      {
        index: true,
        element: (
          <WrappedRoute>
            <HomePage />
          </WrappedRoute>
        ),
      },
      {
        path: 'materials',
        element: (
          <WrappedRoute>
            <MaterialsPage />
          </WrappedRoute>
        ),
      },
      {
        path: 'search',
        element: (
          <WrappedRoute>
            <SearchPage />
          </WrappedRoute>
        ),
      },
      {
        path: 'teach',
        element: (
          <WrappedRoute>
            <TeachPage />
          </WrappedRoute>
        ),
      },
      {
        path: 'explore',
        element: (
          <WrappedRoute>
            <ExplorePage />
          </WrappedRoute>
        ),
      },
      // 旧链接兜底：书签/分享里剩下的历史路径统一回到首页
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return (
    <ErrorBoundary>
      <SupabaseProvider>
        <SubscriptionProvider>
          <WorkspaceProvider>
            <ThemeProvider>
              <RouterProvider router={router} />
            </ThemeProvider>
          </WorkspaceProvider>
        </SubscriptionProvider>
      </SupabaseProvider>
    </ErrorBoundary>
  );
}
