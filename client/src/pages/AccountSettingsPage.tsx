import React, { useState } from 'react';
import { KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { changePassword } from '@/lib/api/auth.api';
import { useAuthStore } from '@/lib/stores/auth';
import { cn } from '@/lib/utils';

// ── Validation schema ──────────────────────────────────────────────────────

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ChangePasswordFields = z.infer<typeof changePasswordSchema>;
type FieldErrors = Partial<Record<keyof ChangePasswordFields, string>>;

// ── PasswordField — reusable controlled input with show/hide toggle ─────────

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  testId?: string;
  error?: string;
  errorId?: string;
  disabled?: boolean;
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  testId,
  error,
  errorId,
  disabled,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-label text-text-muted mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          data-testid={testId}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'w-full bg-surface-primary border rounded-lg px-3 py-2.5 pr-10',
            'text-body text-text-default placeholder-text-muted/50',
            'focus:outline-none focus:ring-2 focus:ring-accent-teal-500 focus:border-transparent',
            'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-error-500' : 'border-border'
          )}
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => setShow((p) => !p)}
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          tabIndex={0}
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2',
            'text-text-muted hover:text-text-default transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500 rounded'
          )}
        >
          {/* Eye icon inline to avoid import coupling in a helper */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {show ? (
              <>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </>
            ) : (
              <>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </>
            )}
          </svg>
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-caption text-error-400">
          {error}
        </p>
      )}
    </div>
  );
}

// ── AccountSettingsPage ────────────────────────────────────────────────────

export function AccountSettingsPage() {
  const user = useAuthStore((s) => s.user);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function clearError(field: keyof FieldErrors) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  const changeMutation = useMutation({
    mutationFn: () => changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFieldErrors({});
    },
  });

  function validateFields(): boolean {
    const result = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
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
    if (!validateFields()) return;
    changeMutation.mutate();
  }

  const isLoading = changeMutation.isPending;
  const isSuccess = changeMutation.isSuccess;
  const isError = changeMutation.isError;

  // Determine the server error message
  function getServerError(): string {
    const err = changeMutation.error as { response?: { data?: { error?: { code?: string } } } } | null;
    if (err?.response?.data?.error?.code === 'UNAUTHORIZED') {
      return 'Current password is incorrect';
    }
    return 'Failed to update password. Please try again.';
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-heading-2 font-mono text-text-default">Account Settings</h1>
        {user && (
          <p className="text-small text-text-muted mt-1">
            Signed in as <span className="text-text-default font-medium">{user.displayName}</span>
            <span className="text-text-muted"> · {user.role}</span>
          </p>
        )}
      </div>

      {/* Change Password card */}
      <section
        aria-labelledby="change-password-heading"
        className="bg-surface-card border border-border rounded-card p-6"
      >
        <div className="flex items-center gap-2 mb-5">
          <KeyRound size={16} className="text-accent-teal-400" aria-hidden="true" />
          <h2
            id="change-password-heading"
            className="text-heading-3 text-text-default"
          >
            Change Password
          </h2>
        </div>

        <form onSubmit={handleSubmit} aria-label="Change password form" noValidate>
          <div className="space-y-4">
            <PasswordField
              id="current-password"
              label="Current Password"
              value={currentPassword}
              onChange={(v) => {
                setCurrentPassword(v);
                clearError('currentPassword');
                // Clear server error so user can retry
                if (changeMutation.isError) changeMutation.reset();
              }}
              autoComplete="current-password"
              testId="settings-current-password"
              error={fieldErrors.currentPassword}
              errorId="current-password-error"
              disabled={isLoading}
            />

            <PasswordField
              id="new-password"
              label="New Password"
              value={newPassword}
              onChange={(v) => {
                setNewPassword(v);
                clearError('newPassword');
              }}
              autoComplete="new-password"
              testId="settings-new-password"
              error={fieldErrors.newPassword}
              errorId="new-password-error"
              disabled={isLoading}
            />

            <PasswordField
              id="confirm-password"
              label="Confirm New Password"
              value={confirmPassword}
              onChange={(v) => {
                setConfirmPassword(v);
                clearError('confirmPassword');
              }}
              autoComplete="new-password"
              testId="settings-confirm-password"
              error={fieldErrors.confirmPassword}
              errorId="confirm-password-error"
              disabled={isLoading}
            />
          </div>

          {/* Server error */}
          {isError && (
            <p
              role="alert"
              data-testid="settings-error"
              className="mt-4 text-small text-error-400"
            >
              {getServerError()}
            </p>
          )}

          {/* Success message */}
          {isSuccess && (
            <div
              role="status"
              data-testid="settings-success"
              className="mt-4 flex items-center gap-2 text-small text-success-500"
            >
              <CheckCircle2 size={14} aria-hidden="true" />
              Password updated successfully
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              data-testid="settings-submit"
              className={cn(
                'bg-accent-teal-600 hover:bg-accent-teal-500 text-white',
                'font-medium px-5 py-2.5 rounded-lg transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-accent-teal-500 focus:ring-offset-2 focus:ring-offset-surface-card',
                'min-h-[44px] flex items-center gap-2',
                'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-accent-teal-600'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  Updating…
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
