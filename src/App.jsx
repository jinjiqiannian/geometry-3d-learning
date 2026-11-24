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
 * 个人自用版只保留三条链路：
 *   /search  搜题解题（默认首页，打开即用）
 *   /teach   知识点讲解
 *   /explore 3D 探索台
 *
 * 营销首页、登录、订阅、个人中心、设置、历史、反馈后台、ExamMind
 * 等面向公众/多用户的页面全部摘除路由。源文件保留在磁盘上，
 * 只是不再可达 —— 需要回看时直接翻文件即可。
 */
const router = createHashRouter([
  {
    path: '/',
    element: <PageLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/search" replace />,
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
      // 旧链接兜底：书签/分享里剩下的历史路径统一回到搜题页
      { path: '*', element: <Navigate to="/search" replace /> },
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
