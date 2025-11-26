import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import Dashboard from './components/pages/dashboard/Index.tsx';

import App from './App.tsx';
import './index.css';

const root = createRoot(document.getElementById('root') as HTMLElement);

const router = createBrowserRouter([
  { path: '/', Component: App },
  { path: '/dashboard', Component: Dashboard },
]);

root.render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
