'use client';
import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { X, ChevronDown, ChevronUp, Check, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { projectsApi } from '@/lib/api/projects.api';
import type { CreateProjectInput } from '@/lib/api/projects.api';
import { cn } from '@/lib/utils';

// ── Validation schema ──────────────────────────────────────────────────────────

const createProjectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200, 'Name is too long'),
  description: z.string().optional(),
  domain: z.enum(['electromechanical', 'bim', 'software', 'other'], {
    required_error: 'Domain is required',
  }),
  status: z
    .enum(['planning', 'active', 'on_hold', 'completed', 'cancelled'])
    .optional()
    .default('planning'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type FormErrors = Partial<Record<keyof z.infer<typeof createProjectSchema>, string>>;

// ── Shared form field styles ───────────────────────────────────────────────────

const inputClass = (hasError?: boolean) =>
  cn(
    'w-full bg-surface-primary border rounded-lg px-3 py-2',
    'text-body text-text-default placeholder-text-muted/50',
    'focus:outline-none focus:ring-2 focus:ring-accent-teal-500 focus:border-transparent',
    'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
    hasError ? 'border-error-500' : 'border-border'
  );

const labelClass = 'block text-label text-text-muted mb-1.5';
const errorClass = 'mt-1 text-caption text-error-400';

// ── Select item component ──────────────────────────────────────────────────────

function SelectItem({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return (
    <Select.Item
      value={value}
      className={cn(
        'flex items-center justify-between px-3 py-2 text-body text-text-default cursor-pointer',
        'hover:bg-surface-elevated focus:bg-surface-elevated outline-none',
        'data-[highlighted]:bg-surface-elevated data-[highlighted]:text-text-default'
      )}
    >
      <Select.ItemText>{children}</Select.ItemText>
      <Select.ItemIndicator>
        <Check size={14} className="text-accent-teal-500" aria-hidden="true" />
      </Select.ItemIndicator>
    </Select.Item>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function CreateProjectModal({ open, onOpenChange }: CreateProjectModalProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState<string>('');
  const [status, setStatus] = useState<string>('planning');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: CreateProjectInput) => projectsApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      handleClose();
    },
    onError: () => {
      setServerError('Failed to create project. Please try again.');
    },
  });

  function resetForm() {
    setName('');
    setDescription('');
    setDomain('');
    setStatus('planning');
    setStartDate('');
    setEndDate('');
    setFieldErrors({});
    setServerError(null);
  }

  function handleClose() {
    resetForm();
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    const result = createProjectSchema.safeParse({
      name,
      description: description || undefined,
      domain: domain || undefined,
      status,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    if (!result.success) {
      const errors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormErrors;
        if (!errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    createMutation.mutate({
      name: result.data.name,
      description: result.data.description,
      domain: result.data.domain,
      status: result.data.status,
      startDate: result.data.startDate ?? null,
      endDate: result.data.endDate ?? null,
    });
  }

  const isLoading = createMutation.isPending;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40 animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-full max-w-lg bg-surface-card border border-border rounded-card shadow-2xl shadow-black/50',
            'animate-slide-up',
            'focus:outline-none'
          )}
          aria-labelledby="create-project-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <Dialog.Title
              id="create-project-title"
              className="text-heading-3 font-mono text-text-default"
            >
              New Project
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label="Close dialog"
                onClick={handleClose}
                className={cn(
                  'text-text-muted hover:text-text-default transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500 rounded'
                )}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Name */}
              <div>
                <label htmlFor="create-name" className={labelClass}>
                  Project name <span className="text-error-400" aria-hidden="true">*</span>
                </label>
                <input
                  id="create-name"
                  type="text"
                  data-testid="create-project-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }));
                  }}
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={fieldErrors.name ? 'create-name-error' : undefined}
                  disabled={isLoading}
                  placeholder="e.g. HVAC System Upgrade"
                  className={inputClass(!!fieldErrors.name)}
                />
                {fieldErrors.name && (
                  <p id="create-name-error" role="alert" className={errorClass}>
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="create-description" className={labelClass}>
                  Description
                </label>
                <textarea
                  id="create-description"
                  data-testid="create-project-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                  rows={3}
                  placeholder="Brief description of the project..."
                  className={cn(inputClass(), 'resize-none')}
                />
              </div>

              {/* Domain */}
              <div>
                <label htmlFor="create-domain-trigger" className={labelClass}>
                  Domain <span className="text-error-400" aria-hidden="true">*</span>
                </label>
                <Select.Root
                  value={domain}
                  onValueChange={(v) => {
                    setDomain(v);
                    if (fieldErrors.domain) setFieldErrors((p) => ({ ...p, domain: undefined }));
                  }}
                  disabled={isLoading}
                >
                  <Select.Trigger
                    id="create-domain-trigger"
                    data-testid="create-project-domain"
                    aria-invalid={!!fieldErrors.domain}
                    aria-describedby={fieldErrors.domain ? 'create-domain-error' : undefined}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg',
                      'text-body bg-surface-primary',
                      'focus:outline-none focus:ring-2 focus:ring-accent-teal-500 focus:border-transparent',
                      'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                      fieldErrors.domain ? 'border border-error-500' : 'border border-border',
                      !domain && 'text-text-muted/50'
                    )}
                  >
                    <Select.Value placeholder="Select domain" />
                    <Select.Icon>
                      <ChevronDown size={14} className="text-text-muted" aria-hidden="true" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      className="bg-surface-elevated border border-border rounded-card shadow-xl shadow-black/40 z-50 overflow-hidden"
                      position="popper"
                      sideOffset={4}
                    >
                      <Select.ScrollUpButton className="flex items-center justify-center py-1 text-text-muted">
                        <ChevronUp size={14} aria-hidden="true" />
                      </Select.ScrollUpButton>
                      <Select.Viewport className="p-1">
                        <SelectItem value="electromechanical">Electromechanical</SelectItem>
                        <SelectItem value="bim">BIM</SelectItem>
                        <SelectItem value="software">Software</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </Select.Viewport>
                      <Select.ScrollDownButton className="flex items-center justify-center py-1 text-text-muted">
                        <ChevronDown size={14} aria-hidden="true" />
                      </Select.ScrollDownButton>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
                {fieldErrors.domain && (
                  <p id="create-domain-error" role="alert" className={errorClass}>
                    {fieldErrors.domain}
                  </p>
                )}
              </div>

              {/* Status */}
              <div>
                <label htmlFor="create-status-trigger" className={labelClass}>
                  Status
                </label>
                <Select.Root value={status} onValueChange={setStatus} disabled={isLoading}>
                  <Select.Trigger
                    id="create-status-trigger"
                    data-testid="create-project-status"
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
                      className="bg-surface-elevated border border-border rounded-card shadow-xl shadow-black/40 z-50 overflow-hidden"
                      position="popper"
                      sideOffset={4}
                    >
                      <Select.Viewport className="p-1">
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="create-start-date" className={labelClass}>
                    Start date
                  </label>
                  <input
                    id="create-start-date"
                    type="date"
                    data-testid="create-project-start-date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={isLoading}
                    className={inputClass()}
                  />
                </div>
                <div>
                  <label htmlFor="create-end-date" className={labelClass}>
                    End date
                  </label>
                  <input
                    id="create-end-date"
                    type="date"
                    data-testid="create-project-end-date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={isLoading}
                    className={inputClass()}
                  />
                </div>
              </div>
            </div>

            {/* Server error */}
            {serverError && (
              <div className="px-6">
                <p role="alert" className="text-small text-error-400">
                  {serverError}
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
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
                type="submit"
                disabled={isLoading}
                data-testid="create-project-submit"
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
                    Creating…
                  </>
                ) : (
                  'Create project'
                )}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
