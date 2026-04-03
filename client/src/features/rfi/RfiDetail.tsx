import React, { useState } from 'react';
import { Send, Clock, MessageSquare, Activity, Save, ChevronDown } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rfiApi, type RfiDetail as RfiDetailType, type RfiStatus } from '@/lib/api/rfi.api';
import {
  DISCIPLINE_COLORS, STATUS_BADGE, PRIORITY_DOT, slaLabel, formatRelativeDate, getInitials,
} from './rfi.utils';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: RfiStatus[] = ['Open', 'Under Review', 'Responded', 'Closed'];

interface Props {
  rfi: RfiDetailType;
  onUpdated: () => void;
}

export function RfiDetailPanel({ rfi, onUpdated }: Props) {
  const qc = useQueryClient();
  const [response, setResponse] = useState(rfi.response ?? '');
  const [comment, setComment] = useState('');
  const sla = slaLabel(rfi.status, rfi.requiredDate);
  const dc = DISCIPLINE_COLORS[rfi.discipline] ?? DISCIPLINE_COLORS['General']!;

  const updateMut = useMutation({
    mutationFn: (data: Parameters<typeof rfiApi.update>[1]) => rfiApi.update(rfi.id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rfis', rfi.projectId] });
      void qc.invalidateQueries({ queryKey: ['rfi', rfi.id] });
      void qc.invalidateQueries({ queryKey: ['rfi-stats', rfi.projectId] });
      onUpdated();
    },
  });

  const commentMut = useMutation({
    mutationFn: (body: string) => rfiApi.addComment(rfi.id, body),
    onSuccess: () => {
      setComment('');
      void qc.invalidateQueries({ queryKey: ['rfi', rfi.id] });
    },
  });

  function handleStatusChange(status: RfiStatus) {
    updateMut.mutate({ status });
  }

  function handleSaveResponse() {
    updateMut.mutate({ response });
  }

  function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (comment.trim()) commentMut.mutate(comment.trim());
  }

  return (
    <div className="overflow-y-auto bg-surface-primary h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-surface-topbar border-b border-border px-6 py-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-caption font-mono text-accent-teal-400">{rfi.rfiNumber}</span>
              <span className={cn('text-caption px-2 py-0.5 rounded-full font-medium', STATUS_BADGE[rfi.status])}>
                {rfi.status}
              </span>
            </div>
            <h2 className="text-heading-3 text-text-default leading-snug">{rfi.title}</h2>
          </div>
          <button
            onClick={handleSaveResponse}
            disabled={updateMut.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-success-500/20 border border-success-500/30 text-success-400 rounded-full text-caption font-medium hover:bg-success-500/30 transition-colors disabled:opacity-50 flex-shrink-0"
          >
            <Save size={13} />
            Save
          </button>
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className={cn('text-caption px-2 py-0.5 rounded-full font-medium border', dc.bg, dc.text, 'border-current/20')}>
            {rfi.discipline}
          </span>
          <span className="flex items-center gap-1 text-caption text-text-muted bg-surface-elevated px-2 py-0.5 rounded-full border border-border">
            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', PRIORITY_DOT[rfi.priority])} />
            {rfi.priority}
          </span>
          {sla.text && (
            <span className={cn('text-caption font-medium bg-surface-elevated px-2 py-0.5 rounded-full border border-border', sla.className)}>
              {sla.text}
            </span>
          )}
          {rfi.requiredDate && (
            <span className="text-caption text-text-muted bg-surface-elevated px-2 py-0.5 rounded-full border border-border">
              Due: {rfi.requiredDate}
            </span>
          )}
          {/* Status selector */}
          <div className="relative ml-auto">
            <select
              value={rfi.status}
              onChange={e => handleStatusChange(e.target.value as RfiStatus)}
              className="appearance-none bg-surface-elevated border border-border text-text-default text-caption rounded-full px-3 py-1 pr-7 focus:outline-none focus:ring-1 focus:ring-accent-teal-500 cursor-pointer"
            >
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* RFI Info */}
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <h3 className="text-label font-semibold text-text-muted uppercase tracking-wider mb-3">RFI Information</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {[
              ['Submitted By',       rfi.submittedBy],
              ['Assigned To',        rfi.assignedTo ?? '—'],
              ['Date Submitted',     rfi.dateSubmitted],
              ['Required Response',  rfi.requiredDate ?? '—'],
              ['Drawing / Doc Ref.', rfi.drawingRef ?? '—'],
              ['Spec Section',       rfi.specRef ?? '—'],
              ...(rfi.responseDate ? [['Response Date', rfi.responseDate]] : []),
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-caption text-text-subtle uppercase tracking-wider mb-0.5">{label}</div>
                <div className="text-body-small text-text-default">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <h3 className="text-label font-semibold text-text-muted uppercase tracking-wider mb-3">
            Question / Description
          </h3>
          <p className="text-body-small text-text-default leading-relaxed whitespace-pre-wrap">{rfi.description}</p>
        </div>

        {/* Official Response */}
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <h3 className="text-label font-semibold text-text-muted uppercase tracking-wider mb-3">
            Official Response
          </h3>
          <textarea
            value={response}
            onChange={e => setResponse(e.target.value)}
            placeholder="Enter response here…"
            className={cn(
              'w-full bg-surface-primary border border-border rounded-md px-3 py-2.5',
              'text-body-small text-text-default placeholder-text-subtle',
              'focus:outline-none focus:ring-2 focus:ring-accent-teal-500 focus:border-transparent',
              'min-h-[120px] resize-y',
            )}
          />
        </div>

        {/* Comments */}
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <h3 className="text-label font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <MessageSquare size={13} className="text-text-subtle" />
            Comments ({rfi.comments.length})
          </h3>

          {rfi.comments.length > 0 ? (
            <div className="space-y-4 mb-4">
              {rfi.comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-info-500/20 flex items-center justify-center text-caption font-semibold text-info-400 flex-shrink-0">
                    {getInitials(c.authorName).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-body-small font-medium text-text-default">{c.authorName}</span>
                      <span className="text-caption text-text-subtle">{formatRelativeDate(c.createdAt)}</span>
                    </div>
                    <p className="text-body-small text-text-default leading-relaxed">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body-small text-text-subtle mb-4">No comments yet.</p>
          )}

          <form onSubmit={handlePostComment} className="border-t border-border pt-4">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-accent-teal-600/20 flex items-center justify-center text-caption font-semibold text-accent-teal-400 flex-shrink-0">
                ME
              </div>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Add a comment…"
                rows={2}
                className={cn(
                  'flex-1 bg-surface-primary border border-border rounded-md px-3 py-2',
                  'text-body-small text-text-default placeholder-text-subtle resize-none',
                  'focus:outline-none focus:ring-2 focus:ring-accent-teal-500 focus:border-transparent',
                )}
              />
              <button
                type="submit"
                disabled={!comment.trim() || commentMut.isPending}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-accent-teal-600 hover:bg-accent-teal-500 text-white rounded-full text-caption font-medium transition-colors disabled:opacity-50"
              >
                <Send size={12} />
                Post
              </button>
            </div>
          </form>
        </div>

        {/* Activity Log */}
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <h3 className="text-label font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <Activity size={13} className="text-text-subtle" />
            Activity Log
          </h3>
          <div className="space-y-0">
            {rfi.activity.map((item, i) => (
              <div key={item.id} className="flex gap-3">
                <div className="flex flex-col items-center w-3.5">
                  <div className={cn('w-2.5 h-2.5 rounded-full border-2 mt-0.5 flex-shrink-0',
                    i === rfi.activity.length - 1
                      ? 'bg-accent-teal-500 border-accent-teal-500'
                      : 'bg-surface-primary border-border'
                  )} />
                  {i < rfi.activity.length - 1 && (
                    <div className="w-0.5 flex-1 bg-border min-h-[14px] my-1" />
                  )}
                </div>
                <div className="pb-3">
                  <div className="text-body-small text-text-default">{item.event}</div>
                  <div className="text-caption text-text-subtle mt-0.5">{formatRelativeDate(item.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
