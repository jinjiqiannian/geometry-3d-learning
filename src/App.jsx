import { lazy, Suspense } from 'react';
import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom';
import { SupabaseProvider } from './contexts/SupabaseContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { TeacherProvider } from './contexts/TeacherContext';
import { ThemeProvider } from './contexts/ThemeContext';
import PageLayout from './layouts/PageLayout';
import LandingPage from './pages/LandingPage';
import ErrorBoundary from './components/ErrorBoundary';
import ChunkErrorBoundary from './components/ChunkErrorBoundary';

// ── Route-level code splitting ──
// Three.js, pptExporter, and heavy engines only load when needed
const PricingPage = lazy(() => import('./pages/PricingPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const EduMindPage = lazy(() => import('./pages/EduMindPage'));
const ExamUploadPage = lazy(() => import('./pages/ExamUploadPage'));
const ExamReportPage = lazy(() => import('./pages/ExamReportPage'));
const LearningPlanPage = lazy(() => import('./pages/LearningPlanPage'));
const EduMindProfile = lazy(() => import('./pages/edumind/ProfilePage'));
const FeedbackAdminPage = lazy(() => import('./pages/FeedbackAdminPage'));
const TeachPage = lazy(() => import('./pages/TeachPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));

// ── Suspense fallback ──
function PageLoader() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        color: 'var(--text-muted)',
        fontSize: 'var(--text-sm)',
      }}
    >
      加载中…
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

const router = createHashRouter([
  {
    path: '/',
    element: <PageLayout />,
    children: [
      {
        index: true,
        element: (
          <WrappedRoute>
            <LandingPage />
          </WrappedRoute>
        ),
      },
      {
        path: 'math',
        element: <Navigate to="/" replace />,
      },
      {
        path: 'physics',
        element: <Navigate to="/" replace />,
      },
      {
        path: 'workspace',
        element: <Navigate to="/search" replace />,
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
        path: 'search',
        element: (
          <WrappedRoute>
            <SearchPage />
          </WrappedRoute>
        ),
      },
      {
        path: 'pricing',
        element: (
          <WrappedRoute>
            <PricingPage />
          </WrappedRoute>
        ),
      },
      {
        path: 'history',
        element: (
          <WrappedRoute>
            <HistoryPage />
          </WrappedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <WrappedRoute>
            <SettingsPage />
          </WrappedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <WrappedRoute>
            <ProfilePage />
          </WrappedRoute>
        ),
      },
      {
        path: 'edumind',
        element: (
          <WrappedRoute>
            <EduMindPage />
          </WrappedRoute>
        ),
      },
      {
        path: 'edumind/upload',
        element: (
          <WrappedRoute>
            <ExamUploadPage />
          </WrappedRoute>
        ),
      },
      {
        path: 'edumind/report/:id',
        element: (
          <WrappedRoute>
            <ExamReportPage />
          </WrappedRoute>
        ),
      },
      {
        path: 'edumind/plan',
        element: (
          <WrappedRoute>
            <LearningPlanPage />
          </WrappedRoute>
        ),
      },
      {
        path: 'edumind/profile',
        element: (
          <WrappedRoute>
            <EduMindProfile />
          </WrappedRoute>
        ),
      },
      {
        path: 'admin/feedback',
        element: (
          <WrappedRoute>
            <FeedbackAdminPage />
          </WrappedRoute>
        ),
      },
    ],
  },
]);

export default function App() {
  return (
    <ErrorBoundary>
      <SupabaseProvider>
        <SubscriptionProvider>
          <WorkspaceProvider>
            <TeacherProvider>
              <ThemeProvider>
                <RouterProvider router={router} />
              </ThemeProvider>
            </TeacherProvider>
          </WorkspaceProvider>
        </SubscriptionProvider>
      </SupabaseProvider>
    </ErrorBoundary>
  );
}
