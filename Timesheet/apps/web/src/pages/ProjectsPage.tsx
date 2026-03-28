import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../lib/api/projects.api';
import { cn } from '../lib/utils';
import type { Project } from '@bim/shared-types';

const RISK_COLORS: Record<string, string> = {
  ON_TRACK: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  AT_RISK: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  OVER_BUDGET: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function ProjectCard({ project }: { project: Project }) {
  const burnPct = project.budgetHours > 0
    ? Math.round(((project.actualHours ?? 0) / project.budgetHours) * 100)
    : 0;

  const riskLevel = burnPct >= 100 ? 'OVER_BUDGET' : burnPct >= 80 ? 'AT_RISK' : 'ON_TRACK';

  return (
    <div className="card hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{project.maDuAn}</span>
            {project.statusName && (
              <span
                className="badge text-white text-xs"
                style={{ backgroundColor: project.statusColor ?? '#6B7280' }}
              >
                {project.statusName}
              </span>
            )}
            {project.isInternal && (
              <span className="badge bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                Nội bộ
              </span>
            )}
          </div>
          <h3 className="mt-1 font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
            {project.projectName}
          </h3>
          {project.projectOtherName && (
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{project.projectOtherName}</p>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
        {project.typeName && <span>📐 {project.typeName}</span>}
        {project.clientName && <span>🏢 {project.clientShortName ?? project.clientName}</span>}
        {project.locationName && <span>📍 {project.locationName}</span>}
        {project.year && <span>📅 {project.year}</span>}
      </div>

      {/* Budget burn bar */}
      {project.budgetHours > 0 && (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500 dark:text-gray-400">
              {(project.actualHours ?? 0).toFixed(0)}h / {project.budgetHours.toFixed(0)}h
            </span>
            <span className={cn('font-medium', RISK_COLORS[riskLevel])}>
              {burnPct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                burnPct >= 100 ? 'bg-red-500' : burnPct >= 80 ? 'bg-yellow-500' : 'bg-green-500'
              )}
              style={{ width: `${Math.min(100, burnPct)}%` }}
            />
          </div>
        </div>
      )}

      {/* Dates */}
      {(project.startDate || project.plannedEndDate) && (
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          {project.startDate && `Bắt đầu: ${new Date(project.startDate).toLocaleDateString('vi-VN')}`}
          {project.startDate && project.plannedEndDate && ' → '}
          {project.plannedEndDate && new Date(project.plannedEndDate).toLocaleDateString('vi-VN')}
        </p>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [statusId, setStatusId] = useState<number | undefined>();
  const [typeId, setTypeId] = useState<number | undefined>();
  const [page, setPage] = useState(1);

  const { data: statuses } = useQuery({
    queryKey: ['project-statuses'],
    queryFn: projectsApi.getStatuses,
    staleTime: 600_000,
  });

  const { data: types } = useQuery({
    queryKey: ['project-types'],
    queryFn: projectsApi.getTypes,
    staleTime: 600_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['projects', { search, statusId, typeId, page }],
    queryFn: () => projectsApi.list({
      search: search || undefined,
      statusId,
      typeId,
      page,
      pageSize: 12,
    }),
    staleTime: 30_000,
  });

  const totalPages = data ? Math.ceil(data.total / 12) : 1;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Dự án</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {data?.total ?? 0} dự án
        </span>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Tìm kiếm mã, tên dự án..."
            className="form-input max-w-xs"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <select
            className="form-select w-auto"
            value={statusId ?? ''}
            onChange={e => { setStatusId(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          >
            <option value="">Tất cả trạng thái</option>
            {statuses?.map(s => (
              <option key={s.statusId} value={s.statusId}>{s.statusName}</option>
            ))}
          </select>
          <select
            className="form-select w-auto"
            value={typeId ?? ''}
            onChange={e => { setTypeId(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          >
            <option value="">Tất cả loại</option>
            {types?.map(t => (
              <option key={t.typeId} value={t.typeId}>{t.typeName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Đang tải...</div>
      ) : !data?.data.length ? (
        <div className="text-center py-12 text-gray-400">
          <p>Không tìm thấy dự án nào</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map(project => (
              <ProjectCard key={project.projectId} project={project} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-secondary"
              >
                ← Trước
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn-secondary"
              >
                Sau →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
