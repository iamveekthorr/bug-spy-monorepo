import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// Auth components
import ProtectedRoute from './components/auth/ProtectedRoute.tsx';

// Dashboard components
import DashboardLayout from './components/layout/DashboardLayout.tsx';
import DashboardOverview from './components/dashboard/DashboardOverview.tsx';
import TestsPage from './components/dashboard/TestsPage.tsx';
import TestResultPage from './components/dashboard/TestResultPage.tsx';
import ScheduledPage from './components/dashboard/ScheduledPage.tsx';
import SettingsPage from './components/dashboard/SettingsPage.tsx';

import App from './App.tsx';
import './index.css';

const root = createRoot(document.getElementById('root') as HTMLElement);

const router = createBrowserRouter([
  { 
    path: '/', 
    Component: App 
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
      { path: 'reports', Component: TestsPage }, // Using TestsPage for reports too
      { path: 'scheduled', Component: ScheduledPage },
      { path: 'settings', Component: SettingsPage },
      { path: 'profile', Component: SettingsPage }, // Profile is part of settings
    ]
  }
]);

root.render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
