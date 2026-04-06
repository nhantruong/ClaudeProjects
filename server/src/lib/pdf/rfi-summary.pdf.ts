/**
 * rfi-summary.pdf.ts — Generates the RFI Summary PDF report.
 * Layout mirrors SummaryClash.rdlc.
 */
import type { Response } from 'express';
import type { Rfi } from '../../models/rfi.model.js';
import {
  PDFDocument,
  MARGIN,
  A4_LAND_W,
  A4_LAND_H,
  C,
  registerFonts,
  drawPageHeader,
  drawTable,
  addPageNumbers,
} from './pdf-helpers.js';

export function generateRfiSummaryPdf(
  rfis: Rfi[],
  meta: { projectName: string },
  res: Response,
): void {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    bufferPages: true,
    autoFirstPage: true,
    info: { Title: 'RFI Summary Report', Author: 'Raphael' },
  });

  registerFonts(doc);
  doc.pipe(res);

  const pageW = A4_LAND_W;
  const pageH = A4_LAND_H;

  // ── Stats subtitle ────────────────────────────────────────────────────────────
  const total = rfis.length;
  const open = rfis.filter((r) => r.status === 'Open').length;
  const underReview = rfis.filter((r) => r.status === 'Under Review').length;
  const responded = rfis.filter((r) => r.status === 'Responded').length;
  const closed = rfis.filter((r) => r.status === 'Closed').length;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = rfis.filter(
    (r) =>
      r.requiredDate &&
      r.requiredDate < today &&
      r.status !== 'Closed' &&
      r.status !== 'Responded',
  ).length;

  drawPageHeader(
    doc,
    `RFI SUMMARY REPORT — ${meta.projectName}`,
    `Total: ${total}  |  Open: ${open}  |  Under Review: ${underReview}  |  Responded: ${responded}  |  Closed: ${closed}  |  Overdue: ${overdue}`,
    pageW,
  );

  // ── Table ────────────────────────────────────────────────────────────────────
  const cols = [
    { header: '#', key: '_no', width: 24, align: 'center' as const },
    { header: 'RFI #', key: 'rfiNumber', width: 72 },
    {
      header: 'Priority',
      key: 'priority',
      width: 55,
      align: 'center' as const,
      color: (v: unknown) =>
        v === 'Urgent' ? C.red : v === 'High' ? '#E86B2A' : undefined,
    },
    {
      header: 'Status',
      key: 'status',
      width: 72,
      align: 'center' as const,
      color: (v: unknown) =>
        v === 'Open' ? C.yellow : v === 'Closed' ? C.green : undefined,
    },
    { header: 'Discipline', key: 'discipline', width: 90 },
    { header: 'Date Submitted', key: 'dateSubmitted', width: 72 },
    { header: 'Required Date', key: 'requiredDate', width: 72 },
    { header: 'Response Date', key: 'responseDate', width: 72 },
    { header: 'Title', key: 'title', width: 170 },
    { header: 'Submitted By', key: 'submittedBy', width: 90 },
    { header: 'Assigned To', key: 'assignedTo', width: 90 },
  ];

  const tableRows = rfis.map((r, idx) => ({
    ...r,
    _no: idx + 1,
    requiredDate: r.requiredDate ?? '—',
    responseDate: r.responseDate ?? '—',
    assignedTo: r.assignedTo ?? '—',
  }));

  drawTable(
    doc,
    cols,
    tableRows as unknown as Record<string, unknown>[],
    MARGIN,
    doc.y,
    18,
    22,
    7.5,
  );

  addPageNumbers(doc, pageW, pageH);
  doc.end();
}
