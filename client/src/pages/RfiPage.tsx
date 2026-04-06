import React, { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { LayoutDashboard, FileText, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { rfiApi } from '@/lib/api/rfi.api';
import { projectsApi } from '@/lib/api/projects.api';
import { reportsApi } from '@/lib/api/reports.api';
import { RfiList } from '@/features/rfi/RfiList';
import { RfiDashboard } from '@/features/rfi/RfiDashboard';
import { RfiDetailPanel } from '@/features/rfi/RfiDetail';
import { NewRfiModal } from '@/features/rfi/NewRfiModal';
import { cn } from '@/lib/utils';

type Tab = 'dashboard' | 'list';

export function RfiPage() {
  const { projectId: projectIdStr } = useParams({ from: '/projects/$projectId/rfis' });
  const projectId = parseInt(projectIdStr, 10);

  const [tab, setTab]           = useState<Tab>('dashboard');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showModal, setShowModal]   = useState(false);
  const [isExportingSummary, setIsExportingSummary] = useState(false);
  const [exportSummaryError, setExportSummaryError] = useState<string | null>(null);

  const projectQ = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
    staleTime: 60_000,
  });
  const projectName = projectQ.data?.project.name ?? 'project';

  async function handleExportSummaryPdf() {
    setIsExportingSummary(true);
    setExportSummaryError(null);
    try {
      await reportsApi.downloadRfiSummaryPdf(projectId, projectName);
    } catch (err) {
      setExportSummaryError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    } finally {
      setIsExportingSummary(false);
    }
  }

  const rfiDetailQ = useQuery({
    queryKey: ['rfi', selectedId],
    queryFn: () => rfiApi.get(selectedId!),
    enabled: selectedId !== null,
    staleTime: 30_000,
  });

  function handleSelect(id: number) {
    setSelectedId(id);
    setTab('list');
  }

  function handleGoToRfi(id: number) {
    setSelectedId(id);
    setTab('list');
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div className="bg-surface-topbar border-b border-border flex items-center px-4 gap-1 flex-shrink-0">
        <button
          onClick={() => setTab('dashboard')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-3 text-body-small font-medium border-b-2 transition-colors',
            tab === 'dashboard'
              ? 'border-accent-teal-500 text-accent-teal-400'
              : 'border-transparent text-text-muted hover:text-text-default',
          )}
        >
          <LayoutDashboard size={14} />
          Dashboard
        </button>
        <button
          onClick={() => setTab('list')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-3 text-body-small font-medium border-b-2 transition-colors',
            tab === 'list'
              ? 'border-accent-teal-500 text-accent-teal-400'
              : 'border-transparent text-text-muted hover:text-text-default',
          )}
        >
          <FileText size={14} />
          RFI List
        </button>
        <div className="ml-auto flex items-center gap-2 py-1.5">
          {exportSummaryError && (
            <span role="alert" className="text-caption text-error-400">{exportSummaryError}</span>
          )}
          <button
            type="button"
            onClick={() => void handleExportSummaryPdf()}
            disabled={isExportingSummary}
            data-testid="export-rfi-summary-pdf"
            className="flex items-center gap-1.5 px-3 py-1.5 text-body-small font-medium rounded border border-border-default text-text-muted hover:text-text-default hover:bg-surface-elevated transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExportingSummary ? (
              <span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" aria-hidden="true" />
            ) : (
              <Download size={13} aria-hidden="true" />
            )}
            {isExportingSummary ? 'Exporting...' : 'Export Summary PDF'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {tab === 'dashboard' ? (
          <RfiDashboard projectId={projectId} onGoToRfi={handleGoToRfi} />
        ) : (
          <>
            {/* Sidebar list */}
            <RfiList
              projectId={projectId}
              selectedId={selectedId}
              onSelect={handleSelect}
              onNew={() => setShowModal(true)}
            />

            {/* Detail panel */}
            <div className="flex-1 overflow-hidden">
              {selectedId && rfiDetailQ.data ? (
                <RfiDetailPanel
                  rfi={rfiDetailQ.data.rfi}
                  onUpdated={() => void rfiDetailQ.refetch()}
                />
              ) : rfiDetailQ.isLoading && selectedId ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 rounded-full border-2 border-accent-teal-500 border-t-transparent animate-spin" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
                  <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center">
                    <FileText size={28} className="text-text-subtle" />
                  </div>
                  <p className="text-body text-text-muted">Select an RFI to view details</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <NewRfiModal projectId={projectId} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
