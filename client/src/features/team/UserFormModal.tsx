import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { usersApi, type User } from '@/lib/api/users.api';
import { cn } from '@/lib/utils';

// ── Validation schemas ─────────────────────────────────────────────────────────

const createSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  username: z.string().min(2, 'Username must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'manager', 'member']),
});

const editSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  role: z.enum(['admin', 'manager', 'member']),
});

type FieldErrors = Partial<Record<string, string>>;

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  mode: 'create' | 'edit';
  user?: User;
  open: boolean;
  onClose: () => void;
}

// ── Field components ───────────────────────────────────────────────────────────

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

function TextField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  error,
  disabled,
  required,
}: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-label text-text-muted mb-1.5">
        {label}
        {required && <span className="text-error-400 ml-0.5" aria-hidden="true">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        data-testid={`user-form-${id}`}
        className={cn(
          'w-full bg-surface-primary border rounded-lg px-3 py-2.5',
          'text-body text-text-default placeholder-text-muted/50',
          'focus:outline-none focus:ring-2 focus:ring-accent-teal-500 focus:border-transparent',
          'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-error-500' : 'border-border'
        )}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-caption text-error-400">
          {error}
        </p>
      )}
    </div>
  );
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  disabled?: boolean;
}

function SelectField({ id, label, value, onChange, options, error, disabled }: SelectFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-label text-text-muted mb-1.5">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        data-testid={`user-form-${id}`}
        className={cn(
          'w-full bg-surface-primary border rounded-lg px-3 py-2.5',
          'text-body text-text-default',
          'focus:outline-none focus:ring-2 focus:ring-accent-teal-500 focus:border-transparent',
          'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-error-500' : 'border-border'
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-caption text-error-400">
          {error}
        </p>
      )}
    </div>
  );
}

// ── UserFormModal ──────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
];

export function UserFormModal({ mode, user, open, onClose }: Props) {
  const queryClient = useQueryClient();

  // Form state
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'member'>(user?.role ?? 'member');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Reset form when modal opens/closes or user changes
  useEffect(() => {
    if (open) {
      setDisplayName(user?.displayName ?? '');
      setUsername(user?.username ?? '');
      setPassword('');
      setRole(user?.role ?? 'member');
      setFieldErrors({});
      setServerError(null);
    }
  }, [open, user]);

  const createMutation = useMutation({
    mutationFn: () =>
      usersApi.create({ displayName, username, password, role }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (err: unknown) => {
      const apiErr = err as { response?: { status?: number; data?: { error?: { message?: string } } } };
      if (apiErr?.response?.status === 409) {
        setServerError('That username is already taken. Please choose another.');
      } else {
        setServerError('Failed to create user. Please try again.');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      usersApi.update(user!.id, { displayName, role }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: () => {
      setServerError('Failed to update user. Please try again.');
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  function clearError(field: string) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validate(): boolean {
    const schema = mode === 'create' ? createSchema : editSchema;
    const data = mode === 'create'
      ? { displayName, username, password, role }
      : { displayName, role };

    const result = schema.safeParse(data);
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return false;
    }
    setFieldErrors({});
    return true;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;
    if (mode === 'create') {
      createMutation.mutate();
    } else {
      updateMutation.mutate();
    }
  }

  const title = mode === 'create' ? 'Add User' : 'Edit User';
  const submitLabel = mode === 'create' ? 'Create User' : 'Save Changes';
  const submitLoadingLabel = mode === 'create' ? 'Creating…' : 'Saving…';

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 bg-black/60 z-40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-full max-w-md bg-surface-card border border-border rounded-lg shadow-2xl shadow-black/50',
            'p-6',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            'duration-200'
          )}
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-heading-3 text-text-default font-semibold">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label="Close dialog"
                data-testid="user-form-close"
                className={cn(
                  'text-text-muted hover:text-text-default transition-colors rounded',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500'
                )}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} aria-label={`${title} form`} noValidate>
            <div className="space-y-4">
              <TextField
                id="displayName"
                label="Display Name"
                value={displayName}
                onChange={(v) => { setDisplayName(v); clearError('displayName'); }}
                placeholder="Jane Smith"
                autoComplete="name"
                error={fieldErrors.displayName}
                disabled={isLoading}
                required
              />

              {mode === 'create' && (
                <TextField
                  id="username"
                  label="Username"
                  value={username}
                  onChange={(v) => { setUsername(v); clearError('username'); setServerError(null); }}
                  placeholder="jane.smith"
                  autoComplete="username"
                  error={fieldErrors.username}
                  disabled={isLoading}
                  required
                />
              )}

              {mode === 'edit' && (
                <div>
                  <span className="block text-label text-text-muted mb-1.5">Username</span>
                  <p className="px-3 py-2.5 text-body text-text-subtle bg-surface-elevated border border-border rounded-lg">
                    {user?.username}
                  </p>
                </div>
              )}

              {mode === 'create' && (
                <TextField
                  id="password"
                  label="Password"
                  value={password}
                  onChange={(v) => { setPassword(v); clearError('password'); }}
                  type="password"
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  error={fieldErrors.password}
                  disabled={isLoading}
                  required
                />
              )}

              <SelectField
                id="role"
                label="Role"
                value={role}
                onChange={(v) => { setRole(v as 'admin' | 'manager' | 'member'); clearError('role'); }}
                options={ROLE_OPTIONS}
                error={fieldErrors.role}
                disabled={isLoading}
              />
            </div>

            {/* Server error */}
            {serverError && (
              <p
                role="alert"
                data-testid="user-form-server-error"
                className="mt-4 text-small text-error-400"
              >
                {serverError}
              </p>
            )}

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={isLoading}
                  data-testid="user-form-cancel"
                  className={cn(
                    'px-4 py-2 text-sm font-medium text-text-default rounded-lg',
                    'bg-surface-elevated border border-border',
                    'hover:bg-surface-card transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isLoading}
                data-testid="user-form-submit"
                className={cn(
                  'px-4 py-2 text-sm font-medium text-white rounded-lg',
                  'bg-accent-teal-500 hover:bg-accent-teal-600 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
                  'min-h-[40px] flex items-center gap-2',
                  'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-accent-teal-500'
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                    {submitLoadingLabel}
                  </>
                ) : (
                  submitLabel
                )}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
