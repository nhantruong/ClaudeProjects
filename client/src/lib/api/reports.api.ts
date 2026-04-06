/**
 * reports.api.ts — Triggers PDF report downloads from the server.
 *
 * These endpoints return application/pdf with Content-Disposition: attachment.
 * We fetch as a blob, create an object URL, and trigger a synthetic anchor click
 * so the browser handles the file save dialog.
 */

function buildUrl(path: string, params: Record<string, string | number | undefined>): string {
  const base = (import.meta.env.VITE_API_URL as string) || '/api/v1';
  const url = new URL(base + path, window.location.origin);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function downloadPdf(url: string, filename: string): Promise<void> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(
      (json as { error?: { message?: string } }).error?.message ?? 'Export failed',
    );
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

export interface TimesheetReportParams {
  from?: string;
  to?: string;
  userId?: number;
  projectId?: number;
}

export const reportsApi = {
  downloadTimesheetPdf: (params: TimesheetReportParams): Promise<void> => {
    const dateStr = new Date().toISOString().slice(0, 10);
    return downloadPdf(
      buildUrl('/reports/timesheet', params as Record<string, string | number | undefined>),
      `timesheet-report-${dateStr}.pdf`,
    );
  },

  downloadRfiSummaryPdf: (projectId: number, projectName: string): Promise<void> => {
    const dateStr = new Date().toISOString().slice(0, 10);
    return downloadPdf(
      buildUrl(`/projects/${projectId}/reports/rfi`, {}),
      `rfi-summary-${projectName.replace(/\s+/g, '-')}-${dateStr}.pdf`,
    );
  },

  downloadRfiDetailPdf: (rfiId: number, rfiNumber: string): Promise<void> =>
    downloadPdf(buildUrl(`/rfis/${rfiId}/report`, {}), `${rfiNumber}.pdf`),
};
