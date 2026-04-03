import React, { useState } from 'react';
import { Plus, Search, FileText, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { rfiApi, type RfiRow, type RfiStatus, type RfiDiscipline, type RfiPriority } from '@/lib/api/rfi.api';
import { STATUS_BADGE, PRIORITY_DOT, DISCIPLINE_COLORS, slaLabel } from './rfi.utils';
import { cn } from '@/lib/utils';

const STATUS_FILTERS: { label: string; value: RfiStatus | 'all' }[] = [
  { label: 'All',        value: 'all' },
  { label: 'Open',       value: 'Open' },
  { label: 'Review',     value: 'Under Review' },
  { label: 'Responded',  value: 'Responded' },
  { label: 'Closed',     value: 'Closed' },
];

interface Props {
  projectId: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
}

export function RfiList({ projectId, selectedId, onSelect, onNew }: Props) {
  const [statusFilter, setStatusFilter] = useState<RfiStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['rfis', projectId, statusFilter],
    queryFn: () => rfiApi.list(projectId, statusFilter !== 'all' ? { status: statusFilter } : undefined),
    staleTime: 30_000,
  });

  const rfis = data?.rfis ?? [];

  const filtered = rfis.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.rfiNumber.toLowerCase().includes(q) ||
      r.discipline.toLowerCase().includes(q) ||
      r.submittedBy.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full bg-surface-sidebar border-r border-border overflow-hidden" style={{ width: 304 }}>
      {/* New button */}
      <div className="p-3 border-b border-border">
        <button
          onClick={onNew}
          data-testid="new-rfi-btn"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-accent-teal-600 hover:bg-accent-teal-500 text-white rounded-full text-body-small font-medium transition-colors shadow"
        >
          <Plus size={15} />
          New RFI
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 bg-surface-primary border border-border rounded-full px-3 py-1.5 focus-within:ring-2 focus-within:ring-accent-teal-500 focus-within:border-transparent">
          <Search size={13} className="text-text-subtle flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search RFIs…"
            className="bg-transparent text-body-small text-text-default placeholder-text-subtle outline-none w-full"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex px-2 gap-0.5 border-b border-border overflow-x-auto">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'flex-shrink-0 px-2.5 py-2.5 text-caption font-medium border-b-2 transition-colors whitespace-nowrap',
              statusFilter === f.value
                ? 'border-accent-teal-500 text-accent-teal-400'
                : 'border-transparent text-text-muted hover:text-text-default',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading && (
          <div className="space-y-2 px-2 pt-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface-card border border-border rounded-md p-3 animate-pulse">
                <div className="h-3 w-24 bg-neutral-700 rounded mb-2" />
                <div className="h-4 w-full bg-neutral-700 rounded mb-1.5" />
                <div className="h-3 w-3/4 bg-neutral-700 rounded" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center gap-2 py-10 px-4 text-center">
            <AlertCircle size={28} className="text-error-400" />
            <p className="text-body-small text-text-muted">Failed to load RFIs</p>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 px-4 text-center">
            <FileText size={28} className="text-text-subtle" />
            <p className="text-body-small text-text-muted">
              {search ? 'No RFIs match your search' : 'No RFIs yet'}
            </p>
          </div>
        )}

        {!isLoading && !isError && filtered.map(rfi => (
          <RfiListItem
            key={rfi.id}
            rfi={rfi}
            isActive={rfi.id === selectedId}
            onClick={() => onSelect(rfi.id)}
          />
        ))}
      </div>
    </div>
  );
}

function RfiListItem({ rfi, isActive, onClick }: { rfi: RfiRow; isActive: boolean; onClick: () => void }) {
  const dc = DISCIPLINE_COLORS[rfi.discipline as RfiDiscipline] ?? DISCIPLINE_COLORS['General']!;
  const sla = slaLabel(rfi.status, rfi.requiredDate);

  return (
    <div
      onClick={onClick}
      className={cn(
        'mx-2 my-0.5 px-3 py-2.5 rounded-md cursor-pointer border-l-2 transition-colors',
        isActive
          ? 'bg-accent-teal-500/10 border-accent-teal-500'
          : 'hover:bg-surface-elevated border-transparent',
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-caption font-mono text-accent-teal-400 font-semibold">{rfi.rfiNumber}</span>
        <span className={cn('text-caption px-1.5 py-0.5 rounded-full font-medium', STATUS_BADGE[rfi.status])}>
          {rfi.status}
        </span>
      </div>
      <div className="text-body-small text-text-default font-medium mb-1.5 line-clamp-2 leading-snug">
        {rfi.title}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1">
          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', PRIORITY_DOT[rfi.priority as RfiPriority])} />
          <span className="text-caption text-text-subtle">{rfi.priority}</span>
        </span>
        <span className={cn('text-caption px-1.5 py-0.5 rounded-full font-medium', dc.bg, dc.text)}>
          {rfi.discipline}
        </span>
        {sla.text && sla.className && (
          <span className={cn('text-caption font-medium ml-auto', sla.className)}>{sla.text}</span>
        )}
      </div>
    </div>
  );
}
