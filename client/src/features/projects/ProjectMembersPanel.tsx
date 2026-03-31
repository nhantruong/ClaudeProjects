'use client';
import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { UserPlusIcon, Trash2Icon, ChevronDown, Check, X, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, usersApi } from '@/lib/api/projects.api';
import { useAuthStore } from '@/lib/stores/auth';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { ProjectMember } from '@/types';

// ── Avatar color helper ────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#1F6FEB',
  '#2EA043',
  '#D29922',
  '#DA3633',
  '#8250DF',
  '#0D9488',
  '#E86B2A',
  '#6E7681',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

// ── Add Member Modal ───────────────────────────────────────────────────────────

interface AddMemberModalProps {
  projectId: number;
  existingMemberIds: number[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AddMemberModal({
  projectId,
  existingMemberIds,
  open,
  onOpenChange,
}: AddMemberModalProps) {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('member');
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
    enabled: open,
  });

  const availableUsers = (usersData?.users ?? []).filter(
    (u) => u.isActive && !existingMemberIds.includes(u.id)
  );

  const addMutation = useMutation({
    mutationFn: () =>
      projectsApi.addMember(
        projectId,
        Number(selectedUserId),
        selectedRole as 'manager' | 'member'
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setSelectedUserId('');
      setSelectedRole('member');
      setServerError(null);
      onOpenChange(false);
    },
    onError: () => {
      setServerError('Failed to add member. Please try again.');
    },
  });

  function handleClose() {
    setSelectedUserId('');
    setSelectedRole('member');
    setServerError(null);
    onOpenChange(false);
  }

  const isLoading = addMutation.isPending;
  const canSubmit = !!selectedUserId && !isLoading;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-full max-w-sm bg-surface-card border border-border rounded-card shadow-2xl shadow-black/50',
            'animate-slide-up focus:outline-none'
          )}
          aria-labelledby="add-member-title"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <Dialog.Title
              id="add-member-title"
              className="text-heading-3 font-mono text-text-default"
            >
              Add Member
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label="Close dialog"
                onClick={handleClose}
                className="text-text-muted hover:text-text-default transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500 rounded"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* User picker */}
            <div>
              <label htmlFor="add-member-user-trigger" className="block text-label text-text-muted mb-1.5">
                Team member <span className="text-error-400" aria-hidden="true">*</span>
              </label>
              <Select.Root
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                disabled={isLoading}
              >
                <Select.Trigger
                  id="add-member-user-trigger"
                  data-testid="add-member-user-select"
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg',
                    'text-body bg-surface-primary border border-border',
                    !selectedUserId ? 'text-text-muted/50' : 'text-text-default',
                    'focus:outline-none focus:ring-2 focus:ring-accent-teal-500 focus:border-transparent',
                    'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <Select.Value placeholder="Select a team member" />
                  <Select.Icon>
                    <ChevronDown size={14} className="text-text-muted" aria-hidden="true" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content
                    className="bg-surface-elevated border border-border rounded-card shadow-xl shadow-black/40 z-[60] overflow-hidden"
                    position="popper"
                    sideOffset={4}
                  >
                    <Select.Viewport className="p-1 max-h-48">
                      {availableUsers.length === 0 ? (
                        <div className="px-3 py-2 text-small text-text-muted">
                          No available members
                        </div>
                      ) : (
                        availableUsers.map((u) => (
                          <Select.Item
                            key={u.id}
                            value={String(u.id)}
                            className={cn(
                              'flex items-center justify-between px-3 py-2 text-body text-text-default cursor-pointer',
                              'hover:bg-surface-hover focus:bg-surface-hover outline-none',
                              'data-[highlighted]:bg-surface-hover'
                            )}
                          >
                            <Select.ItemText>{u.displayName}</Select.ItemText>
                            <Select.ItemIndicator>
                              <Check size={14} className="text-accent-teal-500" aria-hidden="true" />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))
                      )}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* Role picker */}
            <div>
              <label htmlFor="add-member-role-trigger" className="block text-label text-text-muted mb-1.5">
                Project role
              </label>
              <Select.Root value={selectedRole} onValueChange={setSelectedRole} disabled={isLoading}>
                <Select.Trigger
                  id="add-member-role-trigger"
                  data-testid="add-member-role-select"
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg',
                    'text-body text-text-default bg-surface-primary border border-border',
                    'focus:outline-none focus:ring-2 focus:ring-accent-teal-500 focus:border-transparent',
                    'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <Select.Value />
                  <Select.Icon>
                    <ChevronDown size={14} className="text-text-muted" aria-hidden="true" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content
                    className="bg-surface-elevated border border-border rounded-card shadow-xl shadow-black/40 z-[60] overflow-hidden"
                    position="popper"
                    sideOffset={4}
                  >
                    <Select.Viewport className="p-1">
                      {(['member', 'manager'] as const).map((r) => (
                        <Select.Item
                          key={r}
                          value={r}
                          className={cn(
                            'flex items-center justify-between px-3 py-2 text-body text-text-default cursor-pointer',
                            'hover:bg-surface-hover focus:bg-surface-hover outline-none',
                            'data-[highlighted]:bg-surface-hover'
                          )}
                        >
                          <Select.ItemText>{r.charAt(0).toUpperCase() + r.slice(1)}</Select.ItemText>
                          <Select.ItemIndicator>
                            <Check size={14} className="text-accent-teal-500" aria-hidden="true" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {serverError && (
              <p role="alert" className="text-small text-error-400">
                {serverError}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className={cn(
                'px-4 py-2 rounded-lg text-body text-text-default',
                'bg-transparent border border-border hover:bg-surface-elevated',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              data-testid="add-member-submit"
              onClick={() => addMutation.mutate()}
              className={cn(
                'px-4 py-2 rounded-lg text-body text-white font-medium',
                'bg-accent-teal-500 hover:bg-accent-teal-600',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
                'flex items-center gap-2',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  Adding…
                </>
              ) : (
                'Add member'
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface ProjectMembersPanelProps {
  projectId: number;
  members: ProjectMember[];
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ProjectMembersPanel({ projectId, members }: ProjectMembersPanelProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const removeMutation = useMutation({
    mutationFn: (userId: number) => projectsApi.removeMember(projectId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setRemovingId(null);
    },
    onError: () => {
      setRemovingId(null);
    },
  });

  function handleRemove(userId: number) {
    setRemovingId(userId);
    removeMutation.mutate(userId);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-heading-3 font-sans text-text-default">
          Members <span className="text-text-muted font-normal text-body">({members.length})</span>
        </h3>
        {canManage && (
          <button
            type="button"
            data-testid="add-member-button"
            onClick={() => setAddModalOpen(true)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label font-medium text-white',
              'bg-accent-teal-500 hover:bg-accent-teal-600',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500'
            )}
          >
            <UserPlusIcon size={14} aria-hidden="true" />
            Add member
          </button>
        )}
      </div>

      {members.length === 0 ? (
        <p className="text-small text-text-muted py-4 text-center">No members yet.</p>
      ) : (
        <ul className="space-y-2" aria-label="Project members">
          {members.map((m) => {
            const isRemoving = removingId === m.userId && removeMutation.isPending;
            return (
              <li
                key={m.userId}
                className="flex items-center gap-3 px-4 py-3 bg-surface-primary rounded-card border border-border"
                data-testid={`member-row-${m.userId}`}
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-label font-semibold flex-shrink-0"
                  style={{ backgroundColor: avatarColor(m.displayName) }}
                  role="img"
                  aria-label={m.displayName}
                >
                  {getInitials(m.displayName)}
                </div>

                {/* Name + role */}
                <div className="flex-1 min-w-0">
                  <p className="text-body text-text-default truncate">{m.displayName}</p>
                  <p className="text-caption text-text-muted capitalize">{m.role}</p>
                </div>

                {/* Remove button */}
                {canManage && (
                  <button
                    type="button"
                    aria-label={`Remove ${m.displayName}`}
                    data-testid={`remove-member-${m.userId}`}
                    disabled={isRemoving}
                    onClick={() => handleRemove(m.userId)}
                    className={cn(
                      'text-text-muted hover:text-error-400 transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500 rounded p-1',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {isRemoving ? (
                      <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2Icon size={14} aria-hidden="true" />
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <AddMemberModal
        projectId={projectId}
        existingMemberIds={members.map((m) => m.userId)}
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
      />
    </div>
  );
}
