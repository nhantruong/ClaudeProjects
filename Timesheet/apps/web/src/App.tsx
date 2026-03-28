import React, { lazy, Suspense } from 'react';
import { RouterProvider, createRouter, createRoute, createRootRoute, redirect } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './lib/stores/auth.store';
import { AppShell } from './components/layout/AppShell';

const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const TimesheetPage = lazy(() => import('./pages/TimesheetPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const LeavePage = lazy(() => import('./pages/LeavePage'));

// ── Query Client ──────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ── Guard ─────────────────────────────────────────────────────
function requireAuth() {
  if (!useAuthStore.getState().isAuthenticated) throw redirect({ to: '/login' });
}

// ── Protected wrapper ─────────────────────────────────────────
function Protected({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore(s => s.isAuthenticated);
  if (!isAuth) {
    window.location.href = '/login';
    return null;
  }
  return (
    <AppShell>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </AppShell>
  );
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    </div>
  );
}

// ── Routes ────────────────────────────────────────────────────
const rootRoute = createRootRoute();

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <LoginPage />
    </Suspense>
  ),
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) throw redirect({ to: '/' });
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: requireAuth,
  component: () => (
    <Protected>
      <DashboardPage />
    </Protected>
  ),
});

const timesheetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/timesheet',
  beforeLoad: requireAuth,
  component: () => (
    <Protected>
      <TimesheetPage />
    </Protected>
  ),
});

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects',
  beforeLoad: requireAuth,
  component: () => (
    <Protected>
      <ProjectsPage />
    </Protected>
  ),
});

const leaveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leave',
  beforeLoad: requireAuth,
  component: () => (
    <Protected>
      <LeavePage />
    </Protected>
  ),
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  dashboardRoute,
  timesheetRoute,
  projectsRoute,
  leaveRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
