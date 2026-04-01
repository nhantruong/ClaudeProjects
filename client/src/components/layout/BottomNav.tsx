import React from 'react';
import { Link, useMatchRoute } from '@tanstack/react-router';
import { LayoutDashboard, FolderOpen, SquareCheckBig, Users } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ElementType;
  label: string;
  to: string;
  adminOnly?: boolean;
}

const BOTTOM_NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Home', to: '/' },
  { icon: FolderOpen, label: 'Projects', to: '/projects' },
  { icon: SquareCheckBig, label: 'Tasks', to: '/tasks' },
  { icon: Users, label: 'Team', to: '/team', adminOnly: true },
];

export function BottomNav() {
  const user = useAuthStore((s) => s.user);
  const matchRoute = useMatchRoute();

  const visibleItems = BOTTOM_NAV_ITEMS.filter(
    (item) => !item.adminOnly || user?.role === 'admin'
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-bottom-nav bg-surface-sidebar border-t border-border z-40 flex items-center"
      aria-label="Bottom navigation"
    >
      {visibleItems.map(({ icon: Icon, label, to }) => {
        const isActive = Boolean(matchRoute({ to, fuzzy: to !== '/' }));
        return (
          <Link
            key={to}
            to={to}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-teal-500',
              isActive ? 'text-accent-teal-400' : 'text-text-muted'
            )}
          >
            <Icon size={24} aria-hidden="true" />
            <span className="text-caption">{label}</span>
            {isActive && (
              <span
                className="absolute bottom-0 w-1 h-1 rounded-full bg-accent-teal-500"
                aria-hidden="true"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
