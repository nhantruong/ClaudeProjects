import React from 'react';
import { Link, useMatchRoute } from '@tanstack/react-router';
import {
  Clock, LayoutDashboard, Users, FolderOpen, CalendarOff,
  BarChart3, Brain, Settings, ChevronLeft, ChevronRight,
  Building2
} from 'lucide-react';
import { useAuthStore } from '../../lib/stores/auth.store';
import { cn } from '../../lib/utils';

interface NavItem {
  icon: React.ElementType;
  label: string;
  to: string;
  minLevel: number;   // minimum hierarchy level
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard',     to: '/',              minLevel: 1 },
  { icon: Clock,           label: 'Timesheet',     to: '/timesheet',     minLevel: 1 },
  { icon: CalendarOff,     label: 'Nghỉ phép',     to: '/leave',         minLevel: 1 },
  { icon: Users,           label: 'Nhân sự',       to: '/employees',     minLevel: 4 },
  { icon: Building2,       label: 'Phòng ban',     to: '/departments',   minLevel: 3 },
  { icon: FolderOpen,      label: 'Dự án',         to: '/projects',      minLevel: 2 },
  { icon: BarChart3,       label: 'Phân tích',     to: '/analytics',     minLevel: 2 },
  { icon: Brain,           label: 'AI Insights',   to: '/ai-insights',   minLevel: 4 },
  { icon: Settings,        label: 'Cài đặt',       to: '/settings',      minLevel: 4 },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: Props) {
  const user = useAuthStore(s => s.user);
  const matchRoute = useMatchRoute();
  const level = user?.hierarchyLevel ?? 1;

  const visibleItems = NAV_ITEMS.filter(item => level >= item.minLevel);

  return (
    <div className="h-full flex flex-col bg-surface-card border-r border-surface-border">
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-surface-border flex-shrink-0',
        collapsed && 'justify-center px-2'
      )}>
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">B</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-bold text-white text-sm truncate">C&BIM Tech</div>
            <div className="text-gray-400 text-xs truncate">Timesheet System</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {visibleItems.map(({ icon: Icon, label, to }) => {
          const isActive = Boolean(matchRoute({ to, fuzzy: to !== '/' }));
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                'hover:bg-surface-hover hover:text-white',
                isActive
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-600/30'
                  : 'text-gray-400',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User + toggle */}
      <div className="flex-shrink-0 border-t border-surface-border">
        {!collapsed && user && (
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {user.firstName[0]}{user.lastName[0]}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white truncate">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-xs text-gray-400 truncate">{user.roleCode}</div>
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center py-3 text-gray-400 hover:text-white hover:bg-surface-hover transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </div>
  );
}
