import React, { useState } from 'react';
import { BrainCircuit, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { login } from '@/lib/api/auth.api';
import { useAuthStore } from '@/lib/stores/auth';
import { cn } from '@/lib/utils';

// ── Validation schema ──────────────────────────────────────────────────────

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormErrors = Partial<Record<keyof z.infer<typeof loginSchema>, string>>;

// ── Component ──────────────────────────────────────────────────────────────

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<LoginFormErrors>({});

  const loginMutation = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      void navigate({ to: '/' });
    },
  });

  function validateFields(): boolean {
    const result = loginSchema.safeParse({ username, password });
    if (!result.success) {
      const errors: LoginFormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof LoginFormErrors;
        errors[field] = issue.message;
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
    loginMutation.mutate();
  }

  const isLoading = loginMutation.isPending;
  const hasServerError = loginMutation.isError;

  return (
    <div className="min-h-screen bg-surface-primary flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent-teal-600 flex items-center justify-center mb-4">
            <BrainCircuit size={24} className="text-white" aria-hidden="true" />
          </div>
          <h1 className="text-heading-2 font-mono text-text-default">Raphael</h1>
          <p className="text-small text-text-muted mt-1">Project Intelligence</p>
        </div>

        {/* Login card */}
        <div className="bg-surface-card border border-border rounded-card p-6 shadow-xl shadow-black/40">
          <h2 className="text-heading-3 text-text-default mb-6">Sign in</h2>

          <form
            onSubmit={handleSubmit}
            aria-label="Login form"
            noValidate
          >
            <div className="space-y-4">
              {/* Username field */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-label text-text-muted mb-1.5"
                >
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  data-testid="login-username"
                  disabled={isLoading}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (fieldErrors.username) setFieldErrors((p) => ({ ...p, username: undefined }));
                  }}
                  aria-invalid={!!fieldErrors.username}
                  aria-describedby={fieldErrors.username ? 'username-error' : undefined}
                  className={cn(
                    'w-full bg-surface-primary border rounded-lg px-3 py-2.5',
                    'text-body text-text-default placeholder-text-muted/50',
                    'focus:outline-none focus:ring-2 focus:ring-accent-teal-500 focus:border-transparent',
                    'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                    fieldErrors.username ? 'border-error-500' : 'border-border'
                  )}
                  placeholder="your.username"
                />
                {fieldErrors.username && (
                  <p
                    id="username-error"
                    role="alert"
                    className="mt-1 text-caption text-error-400"
                  >
                    {fieldErrors.username}
                  </p>
                )}
              </div>

              {/* Password field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-label text-text-muted mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    data-testid="login-password"
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                    }}
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                    className={cn(
                      'w-full bg-surface-primary border rounded-lg px-3 py-2.5 pr-10',
                      'text-body text-text-default placeholder-text-muted/50',
                      'focus:outline-none focus:ring-2 focus:ring-accent-teal-500 focus:border-transparent',
                      'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                      fieldErrors.password ? 'border-error-500' : 'border-border'
                    )}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                    className={cn(
                      'absolute right-3 top-1/2 -translate-y-1/2',
                      'text-text-muted hover:text-text-default transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500 rounded'
                    )}
                  >
                    {showPassword ? (
                      <EyeOff size={16} aria-hidden="true" />
                    ) : (
                      <Eye size={16} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p
                    id="password-error"
                    role="alert"
                    className="mt-1 text-caption text-error-400"
                  >
                    {fieldErrors.password}
                  </p>
                )}
              </div>
            </div>

            {/* Server-side error — shown inline below fields */}
            {hasServerError && (
              <p
                role="alert"
                data-testid="login-error"
                className="mt-4 text-small text-error-400 text-center"
              >
                Invalid username or password
              </p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              data-testid="login-submit"
              className={cn(
                'mt-6 w-full bg-accent-teal-600 hover:bg-accent-teal-500 text-white',
                'font-medium py-2.5 rounded-lg transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-accent-teal-500 focus:ring-offset-2 focus:ring-offset-surface-card',
                'min-h-[44px] flex items-center justify-center gap-2',
                'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-accent-teal-600'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                'Log In'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-caption text-text-muted mt-6">
          Accounts are managed by your administrator.
        </p>
      </div>
    </div>
  );
}
