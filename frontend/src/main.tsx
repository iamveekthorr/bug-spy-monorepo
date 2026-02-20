import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Auth components
import ProtectedRoute from './components/auth/ProtectedRoute.tsx';

// Dashboard components
import DashboardLayout from './components/layout/DashboardLayout.tsx';
import DashboardOverview from './components/dashboard/DashboardOverview.tsx';
import TestsPage from './components/dashboard/TestsPage.tsx';
import TestResultPage from './components/dashboard/TestResultPage.tsx';
import ScheduledPageEnhanced from './components/dashboard/ScheduledPageEnhanced.tsx';
import SettingsPage from './components/dashboard/SettingsPage.tsx';
import TestHistoryPage from './components/dashboard/TestHistoryPage.tsx';
import AnalyticsPage from './components/dashboard/AnalyticsPage.tsx';
import BatchTestsPage from './components/dashboard/BatchTestsPage.tsx';

import App from './App.tsx';
import './index.css';

const root = createRoot(document.getElementById('root') as HTMLElement);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true, // Auto-refresh on window focus
      refetchOnReconnect: true, // Auto-refresh on reconnect
      staleTime: 2 * 60 * 1000, // 2 minutes - data is fresh for 2 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes - cache garbage collection time (formerly cacheTime)
    },
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    Component: App,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, Component: DashboardOverview },
      { path: 'tests', Component: TestsPage },
      { path: 'tests/:id', Component: TestResultPage },
      { path: 'history', Component: TestHistoryPage },
      { path: 'analytics', Component: AnalyticsPage },
      { path: 'reports', Component: AnalyticsPage }, // Reports is the analytics page
      { path: 'scheduled', Component: ScheduledPageEnhanced },
      { path: 'batch-tests', Component: BatchTestsPage },
      { path: 'batch-tests/:id', Component: TestResultPage }, // Reusing TestResultPage for now
      { path: 'settings', Component: SettingsPage },
      { path: 'profile', Component: SettingsPage }, // Profile is part of settings
    ],
  },
]);

root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>,
);
