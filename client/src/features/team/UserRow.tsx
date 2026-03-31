import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { usersApi, type User } from '@/lib/api/users.api';
import { cn, getInitials } from '@/lib/utils';

// ── Role badge ─────────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<User['role'], string> = {
  admin: 'bg-[#DA3633] text-white',
  manager: 'bg-[#1F6FEB] text-white',
  member: 'bg-[#484F58] text-white',
};

const ROLE_LABELS: Record<User['role'], string> = {
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
};

function RoleBadge({ role }: { role: User['role'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide',
        ROLE_STYLES[role]
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#1F6FEB', '#2EA043', '#D29922', '#DA3633',
  '#8250DF', '#0D9488', '#E86B2A', '#6E7681',
];

function getAvatarColor(displayName: string): string {
  let hash = 0;
  for (let i = 0; i < displayName.length; i++) {
    hash = (hash * 31 + displayName.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}

function Avatar({ displayName }: { displayName: string }) {
  const bg = getAvatarColor(displayName);
  const initials = getInitials(displayName);

  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0 select-none"
      style={{ backgroundColor: bg }}
      role="img"
      aria-label={displayName}
      title={displayName}
    >
      {initials}
    </div>
  );
}

// ── UserRow ────────────────────────────────────────────────────────────────────

interface Props {
  user: User;
  currentUserId: number | undefined;
  onEdit: (user: User) => void;
}

export function UserRow({ user, currentUserId, onEdit }: Props) {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: () => usersApi.update(user.id, { isActive: !user.isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const isSelf = user.id === currentUserId;
  const isToggling = toggleMutation.isPending;

  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_120px_100px_100px] gap-4 px-4 py-3 items-center',
        'transition-colors hover:bg-surface-elevated/40',
        !user.isActive && 'opacity-60'
      )}
      data-testid={`user-row-${user.id}`}
    >
      {/* Member column: avatar + name + username */}
      <div className="flex items-center gap-3 min-w-0">
        <Avatar displayName={user.displayName} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-default truncate">{user.displayName}</p>
          <p className="text-xs text-text-muted truncate">@{user.username}</p>
        </div>
      </div>

      {/* Role column */}
      <div>
        <RoleBadge role={user.role} />
      </div>

      {/* Status column */}
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'w-2 h-2 rounded-full flex-shrink-0',
            user.isActive ? 'bg-success-500' : 'bg-neutral-600'
          )}
          aria-hidden="true"
        />
        <span className={cn('text-xs', user.isActive ? 'text-text-muted' : 'text-text-subtle')}>
          {user.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Actions column */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onEdit(user)}
          data-testid={`user-edit-${user.id}`}
          aria-label={`Edit ${user.displayName}`}
          className={cn(
            'px-2.5 py-1 text-xs font-medium rounded',
            'text-text-muted hover:text-text-default',
            'hover:bg-surface-elevated transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500'
          )}
        >
          Edit
        </button>

        {!isSelf && (
          <button
            type="button"
            onClick={() => toggleMutation.mutate()}
            disabled={isToggling}
            data-testid={`user-toggle-${user.id}`}
            aria-label={user.isActive ? `Deactivate ${user.displayName}` : `Reactivate ${user.displayName}`}
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              user.isActive
                ? 'text-error-400 hover:bg-error-500/10'
                : 'text-accent-teal-400 hover:bg-accent-teal-500/10'
            )}
          >
            {isToggling ? (
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
            ) : user.isActive ? (
              'Deactivate'
            ) : (
              'Reactivate'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
