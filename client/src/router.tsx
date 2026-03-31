import React, { lazy, Suspense } from 'react';
import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
} from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { useAuthStore } from '@/lib/stores/auth';
import { ProjectDetailPage } from '@/features/projects/ProjectDetailPage';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────

const LoginPage = lazy(() =>
  import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const ProjectsPage = lazy(() =>
  import('@/pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage }))
);
const TeamPage = lazy(() =>
  import('@/pages/TeamPage').then((m) => ({ default: m.TeamPage }))
);
const AccountSettingsPage = lazy(() =>
  import('@/pages/AccountSettingsPage').then((m) => ({ default: m.AccountSettingsPage }))
);
const KanbanPage = lazy(() =>
  import('@/pages/KanbanPage').then((m) => ({ default: m.KanbanPage }))
);

// ── Loading fallback ──────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64" aria-label="Loading">
      <div
        className="h-8 w-8 rounded-full border-2 border-accent-teal-500 border-t-transparent animate-spin"
        aria-hidden="true"
      />
    </div>
  );
}

// ── Auth guard ────────────────────────────────────────────────────────────────

function requireAuth() {
  const { isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated) {
    throw redirect({ to: '/login' });
  }
}

function requireAdmin() {
  requireAuth();
  const { user } = useAuthStore.getState();
  if (user?.role !== 'admin') {
    throw redirect({ to: '/' });
  }
}

// ── Protected wrapper — wraps authenticated pages in the AppShell ─────────────

function Protected({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }
  return (
    <AppShell>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </AppShell>
  );
}

// ── Route tree ────────────────────────────────────────────────────────────────

const rootRoute = createRootRoute();

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/' });
    }
  },
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <LoginPage />
    </Suspense>
  ),
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

const teamRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/team',
  beforeLoad: requireAdmin,
  component: () => (
    <Protected>
      <TeamPage />
    </Protected>
  ),
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  beforeLoad: requireAuth,
  component: () => (
    <Protected>
      <AccountSettingsPage />
    </Protected>
  ),
});

// Project detail
const projectDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId',
  beforeLoad: requireAuth,
  component: () => (
    <Protected>
      <ProjectDetailPage />
    </Protected>
  ),
});

// Kanban board (component implemented in task #012)
const kanbanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId/kanban',
  beforeLoad: requireAuth,
  component: () => (
    <Protected>
      <KanbanPage />
    </Protected>
  ),
});

// Catch-all redirect to dashboard
const indexRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: () => {
    throw redirect({ to: '/' });
  },
  component: () => null,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  dashboardRoute,
  projectsRoute,
  projectDetailRoute,
  kanbanRoute,
  teamRoute,
  settingsRoute,
  indexRedirectRoute,
]);

// ── Router export ─────────────────────────────────────────────────────────────

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
