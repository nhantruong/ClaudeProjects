import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserPlus, Users } from 'lucide-react';
import { usersApi, type User } from '@/lib/api/users.api';
import { UserRow } from '@/features/team/UserRow';
import { UserFormModal } from '@/features/team/UserFormModal';
import { useAuthStore } from '@/lib/stores/auth';

// ── TeamPage ───────────────────────────────────────────────────────────────────

export function TeamPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const currentUser = useAuthStore((s) => s.user);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
    staleTime: 30_000,
  });

  const users = data?.users ?? [];
  const activeUsers = users.filter((u) => u.isActive);
  const inactiveUsers = users.filter((u) => !u.isActive);

  if (isLoading) return <TeamSkeleton />;
  if (isError) return <ErrorState />;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-mono text-text-default">Team</h1>
          <p className="text-text-muted text-sm mt-1">
            {activeUsers.length} active member{activeUsers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          data-testid="add-user-button"
          className="flex items-center gap-2 px-4 py-2 bg-accent-teal-500 hover:bg-accent-teal-600 text-white text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-primary"
        >
          <UserPlus size={16} aria-hidden="true" />
          Add User
        </button>
      </div>

      {/* Active users table */}
      <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_120px_100px_minmax(140px,1fr)_100px] gap-4 px-4 py-3 border-b border-border bg-surface-elevated text-xs font-medium text-text-muted uppercase tracking-wide">
          <div>Member</div>
          <div>Role</div>
          <div>Status</div>
          <div>Projects</div>
          <div className="text-right">Actions</div>
        </div>

        {activeUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users size={40} className="text-neutral-600 mb-3" aria-hidden="true" />
            <p className="text-text-muted text-sm">No active users</p>
          </div>
        ) : (
          <div
            className="divide-y divide-border"
            role="list"
            aria-label="Active team members"
          >
            {activeUsers.map((user) => (
              <div key={user.id} role="listitem">
                <UserRow
                  user={user}
                  currentUserId={currentUser?.id}
                  onEdit={setEditUser}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inactive users (collapsed section) */}
      {inactiveUsers.length > 0 && (
        <details className="mt-6" data-testid="inactive-users-section">
          <summary className="text-sm text-text-muted cursor-pointer hover:text-text-default select-none mb-3 list-none flex items-center gap-1.5">
            <span className="font-medium">{inactiveUsers.length}</span>
            {' '}deactivated account{inactiveUsers.length !== 1 ? 's' : ''}
          </summary>
          <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
            <div
              className="divide-y divide-border"
              role="list"
              aria-label="Deactivated team members"
            >
              {inactiveUsers.map((user) => (
                <div key={user.id} role="listitem">
                  <UserRow
                    user={user}
                    currentUserId={currentUser?.id}
                    onEdit={setEditUser}
                  />
                </div>
              ))}
            </div>
          </div>
        </details>
      )}

      {/* Modals */}
      <UserFormModal
        mode="create"
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
      {editUser && (
        <UserFormModal
          mode="edit"
          user={editUser}
          open={true}
          onClose={() => setEditUser(null)}
        />
      )}
    </div>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────────

function TeamSkeleton() {
  return (
    <div className="p-6 max-w-5xl mx-auto animate-pulse" aria-busy="true" aria-label="Loading team">
      <div className="flex justify-between mb-6">
        <div className="space-y-2">
          <div className="h-7 w-24 bg-surface-card rounded" />
          <div className="h-4 w-32 bg-surface-card rounded" />
        </div>
        <div className="h-9 w-28 bg-surface-card rounded-lg" />
      </div>
      <div className="bg-surface-card border border-border rounded-lg divide-y divide-border overflow-hidden">
        <div className="h-10 bg-surface-elevated" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 px-4 flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-surface-elevated flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-36 bg-surface-elevated rounded" />
              <div className="h-3 w-24 bg-surface-elevated rounded" />
            </div>
            <div className="h-5 w-16 bg-surface-elevated rounded-full" />
            <div className="h-3 w-12 bg-surface-elevated rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Error state ────────────────────────────────────────────────────────────────

function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center gap-2 p-6">
      <p className="text-text-default font-medium">Failed to load team members</p>
      <p className="text-text-muted text-sm">Refresh the page to try again.</p>
    </div>
  );
}
