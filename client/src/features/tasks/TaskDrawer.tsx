'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { TaskDetailPanel } from './TaskDetailPanel';

// ── Keyframe styles injected once ─────────────────────────────────────────────

const DRAWER_ANIMATION_ID = 'raphael-drawer-animation';

if (typeof document !== 'undefined' && !document.getElementById(DRAWER_ANIMATION_ID)) {
  const style = document.createElement('style');
  style.id = DRAWER_ANIMATION_ID;
  style.textContent = `
    @keyframes raphael-slide-in-right {
      from { transform: translateX(100%); }
      to   { transform: translateX(0); }
    }
    @keyframes raphael-slide-out-right {
      from { transform: translateX(0); }
      to   { transform: translateX(100%); }
    }
    @keyframes raphael-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes raphael-fade-out {
      from { opacity: 1; }
      to   { opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      [data-raphael-drawer] {
        animation: raphael-fade-in 150ms ease !important;
      }
      [data-raphael-drawer-overlay] {
        animation: raphael-fade-in 150ms ease !important;
      }
    }
  `;
  document.head.appendChild(style);
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface TaskDrawerProps {
  taskId: number | null;
  onClose: () => void;
}

// ── TaskDrawer ─────────────────────────────────────────────────────────────────

export function TaskDrawer({ taskId, onClose }: TaskDrawerProps) {
  const isOpen = taskId !== null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay
          data-raphael-drawer-overlay
          className="fixed inset-0 bg-black/50 z-40"
          style={{
            animation: 'raphael-fade-in 200ms ease-out',
          }}
        />

        {/* Drawer panel */}
        <Dialog.Content
          data-raphael-drawer
          className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-2xl bg-surface-card border-l border-border shadow-2xl flex flex-col focus:outline-none"
          style={{
            animation: 'raphael-slide-in-right 200ms ease-out',
          }}
          aria-label="Task detail"
          data-testid="task-drawer"
          onEscapeKeyDown={onClose}
          onInteractOutside={onClose}
        >
          {/* Only render the panel when we have a taskId to avoid unmounting state */}
          {taskId !== null && (
            <TaskDetailPanel taskId={taskId} onClose={onClose} />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
