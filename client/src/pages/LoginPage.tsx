import React from 'react';
import { BrainCircuit } from 'lucide-react';

// TODO (task #006): Implement full login form with React Hook Form + Zod validation.
// This page currently renders the shell layout only.
// Acceptance criteria: username/password fields, error handling, redirect on success.

export function LoginPage() {
  return (
    <div className="min-h-screen bg-surface-primary flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent-teal-600 flex items-center justify-center mb-4">
            <BrainCircuit size={24} className="text-white" aria-hidden="true" />
          </div>
          <h1 className="text-heading-2 font-mono text-text-default">Raphael</h1>
          <p className="text-small text-text-muted mt-1">Project Management</p>
        </div>

        {/* Login card */}
        <div className="bg-surface-card border border-border rounded-card p-6 shadow-xl shadow-black/40">
          <h2 className="text-heading-3 text-text-default mb-6">Sign in</h2>

          <form
            onSubmit={(e) => e.preventDefault()}
            aria-label="Login form"
            noValidate
          >
            <div className="space-y-4">
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
                  className="w-full bg-surface-primary border border-border rounded-lg px-3 py-2.5 text-body text-text-default placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent-teal-500 focus:border-transparent transition-colors"
                  placeholder="your.username"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-label text-text-muted mb-1.5"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  data-testid="login-password"
                  className="w-full bg-surface-primary border border-border rounded-lg px-3 py-2.5 text-body text-text-default placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent-teal-500 focus:border-transparent transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              data-testid="login-submit"
              className="mt-6 w-full bg-accent-teal-600 hover:bg-accent-teal-500 text-white font-medium py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent-teal-500 focus:ring-offset-2 focus:ring-offset-surface-card min-h-[44px]"
            >
              Log In
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
