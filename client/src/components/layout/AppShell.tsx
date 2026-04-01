import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { cn } from '@/lib/utils';

interface Props {
  children: React.ReactNode;
}

/**
 * AppShell — three-breakpoint layout:
 *
 * Desktop (≥1280px): Fixed sidebar (240px expanded / 64px collapsed) + top bar + main content
 * Tablet (768px–1279px): Top bar with hamburger + slide-over drawer sidebar + main content
 * Mobile (<768px): Top bar + bottom nav bar + full-width main content
 */
export function AppShell({ children }: Props) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer on Escape key
  useEffect(() => {
    if (!drawerOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [drawerOpen]);

  // Trap focus inside drawer when open
  useEffect(() => {
    if (drawerOpen && drawerRef.current) {
      drawerRef.current.focus();
    }
  }, [drawerOpen]);

  return (
    <>
      {/* Skip to main content — visually hidden until focused */}
      <a
        href="#main-content"
        className={cn(
          'sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100]',
          'focus:px-4 focus:py-2 focus:rounded-lg focus:bg-accent-teal-500 focus:text-white',
          'focus:text-sm focus:font-medium focus:shadow-lg'
        )}
      >
        Skip to main content
      </a>

      <div className="flex h-screen bg-surface-primary text-text-default overflow-hidden">
        {/* ── Desktop sidebar (hidden on tablet/mobile) ──────────────────── */}
        <aside
          className={cn(
            'hidden lg:flex flex-shrink-0 transition-all duration-300',
            sidebarCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
          )}
          aria-label="Desktop sidebar"
        >
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((p) => !p)}
          />
        </aside>

        {/* ── Tablet/mobile drawer overlay ───────────────────────────────── */}
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/60 lg:hidden animate-fade-in"
              aria-hidden="true"
              onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer */}
            <div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              tabIndex={-1}
              className={cn(
                'fixed top-0 left-0 bottom-0 z-50 w-sidebar-drawer lg:hidden',
                'animate-slide-in-left focus-visible:outline-none'
              )}
            >
              <Sidebar collapsed={false} onToggle={() => setDrawerOpen(false)} />
            </div>
          </>
        )}

        {/* ── Main area ──────────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopBar
            showMenuButton={true}
            onMenuOpen={() => setDrawerOpen(true)}
          />

          <main
            id="main-content"
            className={cn(
              'flex-1 overflow-auto p-4 md:p-6 animate-fade-in',
              // On mobile, add padding at bottom to clear the fixed bottom nav
              'pb-[calc(1rem+56px)] md:pb-6'
            )}
            tabIndex={-1}
          >
            {children}
          </main>
        </div>
      </div>

      {/* ── Mobile bottom navigation (hidden on lg+) ───────────────────────── */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </>
  );
}
