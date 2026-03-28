import React from 'react';
import { LogOut, User, KeyRound, Menu } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuthStore } from '@/lib/stores/auth';
import { apiClient } from '@/lib/api';
import { getInitials, cn } from '@/lib/utils';

interface Props {
  /** Called when hamburger button is clicked (tablet/mobile) */
  onMenuOpen?: () => void;
  /** Show hamburger button — true on tablet/mobile */
  showMenuButton?: boolean;
  /** Current page title for mobile top bar */
  pageTitle?: string;
}

export function TopBar({ onMenuOpen, showMenuButton = false, pageTitle }: Props) {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      logout();
      window.location.href = '/login';
    }
  };

  return (
    <header
      className="h-topbar flex items-center justify-between px-4 md:px-6 border-b border-border flex-shrink-0"
      style={{ backgroundColor: '#161B22' }}
    >
      {/* Left: hamburger (mobile/tablet) + breadcrumb/title */}
      <div className="flex items-center gap-3 min-w-0">
        {showMenuButton && (
          <button
            onClick={onMenuOpen}
            aria-label="Open navigation menu"
            data-testid="mobile-menu-button"
            className={cn(
              'flex items-center justify-center w-11 h-11 rounded-lg',
              'text-text-muted hover:text-text-default hover:bg-surface-hover transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500'
            )}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        )}

        {pageTitle ? (
          <span className="text-sm font-semibold text-text-default truncate">{pageTitle}</span>
        ) : (
          <span className="hidden md:block text-sm font-semibold text-text-default font-mono">
            Raphael
          </span>
        )}
      </div>

      {/* Right: user avatar dropdown */}
      {user && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              aria-label={`Account menu for ${user.displayName}`}
              data-testid="user-menu-trigger"
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors min-h-[44px]',
                'text-text-muted hover:text-text-default hover:bg-surface-hover',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500'
              )}
            >
              <div className="w-7 h-7 rounded-full bg-accent-teal-600/30 border border-accent-teal-600/50 flex items-center justify-center">
                <span className="text-accent-teal-400 text-xs font-bold font-mono">
                  {getInitials(user.displayName)}
                </span>
              </div>
              <span className="hidden md:block text-sm font-medium text-text-default">
                {user.displayName}
              </span>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className={cn(
                'z-50 min-w-[180px] rounded-lg border border-border bg-surface-card py-1',
                'shadow-lg shadow-black/40',
                'animate-fade-in'
              )}
            >
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-medium text-text-default">{user.displayName}</p>
                <p className="text-caption text-text-muted capitalize">{user.role}</p>
              </div>

              <DropdownMenu.Item asChild>
                <a
                  href="/settings"
                  data-testid="user-menu-settings"
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm text-text-muted cursor-pointer',
                    'hover:bg-surface-hover hover:text-text-default',
                    'focus-visible:outline-none focus-visible:bg-surface-hover'
                  )}
                >
                  <User size={14} aria-hidden="true" />
                  Account Settings
                </a>
              </DropdownMenu.Item>

              <DropdownMenu.Item asChild>
                <a
                  href="/settings/password"
                  data-testid="user-menu-password"
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm text-text-muted cursor-pointer',
                    'hover:bg-surface-hover hover:text-text-default',
                    'focus-visible:outline-none focus-visible:bg-surface-hover'
                  )}
                >
                  <KeyRound size={14} aria-hidden="true" />
                  Change Password
                </a>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="my-1 border-t border-border" />

              <DropdownMenu.Item asChild>
                <button
                  onClick={handleLogout}
                  data-testid="user-menu-logout"
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted cursor-pointer',
                    'hover:bg-surface-hover hover:text-error-400',
                    'focus-visible:outline-none focus-visible:bg-surface-hover'
                  )}
                >
                  <LogOut size={14} aria-hidden="true" />
                  Log out
                </button>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </header>
  );
}
