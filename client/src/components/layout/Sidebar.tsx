import React from 'react';
import { Link, useMatchRoute } from '@tanstack/react-router';
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth';
import { cn, getInitials } from '@/lib/utils';

interface NavItem {
  icon: React.ElementType;
  label: string;
  to: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
  { icon: FolderOpen, label: 'Projects', to: '/projects' },
  { icon: Users, label: 'Team', to: '/team', adminOnly: true },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: Props) {
  const user = useAuthStore((s) => s.user);
  const matchRoute = useMatchRoute();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || user?.role === 'admin'
  );

  return (
    <div
      className="h-full flex flex-col border-r border-border"
      style={{ backgroundColor: 'var(--color-surface-sidebar, #0D1117)' }}
    >
      {/* Logo / brand */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-5 border-b border-border flex-shrink-0',
          collapsed && 'justify-center px-2'
        )}
      >
        <div className="w-8 h-8 rounded-lg bg-accent-teal-600 flex items-center justify-center flex-shrink-0">
          <BrainCircuit size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-semibold text-text-default text-sm truncate font-mono">
              Raphael
            </div>
            <div className="text-text-muted text-caption truncate">Project Manager</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto py-4 space-y-1 px-2"
        aria-label="Main navigation"
      >
        {visibleItems.map(({ icon: Icon, label, to }) => {
          const isActive = Boolean(matchRoute({ to, fuzzy: to !== '/' }));
          return (
            <Link
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]',
                'hover:bg-surface-hover hover:text-text-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
                isActive
                  ? 'text-accent-teal-400 border-l-[3px] border-accent-teal-500 bg-accent-teal-500/10 pl-[9px]'
                  : 'text-text-muted border-l-[3px] border-transparent',
                collapsed && 'justify-center px-2 border-l-0'
              )}
            >
              <Icon size={18} className="flex-shrink-0" aria-hidden="true" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Settings link */}
      <div className="px-2 pb-2">
        <Link
          to="/settings"
          title={collapsed ? 'Settings' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]',
            'text-text-muted hover:bg-surface-hover hover:text-text-default',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
            collapsed && 'justify-center px-2'
          )}
        >
          <Settings size={18} className="flex-shrink-0" aria-hidden="true" />
          {!collapsed && <span className="truncate">Settings</span>}
        </Link>
      </div>

      {/* User info + collapse toggle */}
      <div className="flex-shrink-0 border-t border-border">
        {!collapsed && user && (
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-teal-600/30 border border-accent-teal-600/50 flex items-center justify-center flex-shrink-0">
              <span className="text-accent-teal-400 text-xs font-bold font-mono">
                {getInitials(user.displayName)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-text-default truncate">
                {user.displayName}
              </div>
              <div className="text-caption text-text-muted truncate capitalize">{user.role}</div>
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-full flex items-center justify-center py-3 min-h-[44px] text-text-muted hover:text-text-default hover:bg-surface-hover transition-colors"
        >
          {collapsed ? (
            <ChevronRight size={16} aria-hidden="true" />
          ) : (
            <ChevronLeft size={16} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
