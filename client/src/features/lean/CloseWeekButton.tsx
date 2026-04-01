import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircleIcon, Loader2 } from 'lucide-react';
import { leanApi } from '@/lib/api/lean.api';
import { cn } from '@/lib/utils';

// ── Props ──────────────────────────────────────────────────────────────────────

interface CloseWeekButtonProps {
  projectId: number;
  weekId: number;
  isClosed: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function CloseWeekButton({ projectId, weekId, isClosed }: CloseWeekButtonProps) {
  const queryClient = useQueryClient();
  const [ppcResult, setPpcResult] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const closeMutation = useMutation({
    mutationFn: () => leanApi.closeWwp(projectId, weekId),
    onSuccess: (data) => {
      setPpcResult(data.wwp.ppc);
      setErrorMsg('');
      void queryClient.invalidateQueries({ queryKey: ['wwp', projectId, weekId] });
      void queryClient.invalidateQueries({ queryKey: ['wwps', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['ppc-history', projectId] });
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      const msg =
        axiosErr?.response?.data?.error?.message ??
        'Failed to close week. Ensure all incomplete tasks have a variance reason.';
      setErrorMsg(msg);
    },
  });

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => {
          setPpcResult(null);
          setErrorMsg('');
          closeMutation.mutate();
        }}
        disabled={closeMutation.isPending}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-label font-medium',
          isClosed
            ? 'bg-surface-elevated border border-border text-text-muted hover:bg-surface-card'
            : 'bg-accent-teal-500 hover:bg-accent-teal-600 text-white',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal-500',
          'transition-colors'
        )}
        data-testid="close-week-button"
      >
        {closeMutation.isPending ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <CheckCircleIcon size={16} aria-hidden="true" />
        )}
        {isClosed ? 'Recalculate PPC' : 'Close week & calculate PPC'}
      </button>

      {/* PPC result banner */}
      {ppcResult !== null && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-success-500/10 border border-success-500/30"
          role="status"
          aria-live="polite"
        >
          <CheckCircleIcon size={16} className="text-success-400 shrink-0" aria-hidden="true" />
          <p className="text-label text-success-400">
            Week closed. PPC:{' '}
            <span className="font-mono font-semibold">{ppcResult.toFixed(1)}%</span>
          </p>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <p className="text-label text-error-400" role="alert">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
