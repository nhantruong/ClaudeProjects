/**
 * timesheet.pdf.ts — Generates the Timesheet PDF report.
 * Layout mirrors TimesheetReportRev1.rdlc.
 */
import type { Response } from 'express';
import type { TimesheetEntry } from '../../models/timesheet.model.js';
import {
  PDFDocument,
  MARGIN,
  A4_LAND_W,
  A4_LAND_H,
  C,
  registerFonts,
  FONT_BODY,
  FONT_BOLD,
  drawPageHeader,
  drawTable,
  addPageNumbers,
} from './pdf-helpers.js';

export interface TimesheetReportEntry extends TimesheetEntry {
  displayName: string; // member full name (joined from users)
}

export function generateTimesheetPdf(
  entries: TimesheetReportEntry[],
  meta: { from?: string; to?: string; memberName?: string; projectName?: string },
  res: Response,
): void {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    bufferPages: true,
    autoFirstPage: true,
    info: { Title: 'Timesheet Report', Author: 'Raphael' },
  });

  registerFonts(doc);
  doc.pipe(res);

  const pageW = A4_LAND_W;
  const pageH = A4_LAND_H;

  // ── Title ────────────────────────────────────────────────────────────────────
  const subtitle = [
    meta.from && meta.to ? `Period: ${meta.from} → ${meta.to}` : '',
    meta.memberName ? `Member: ${meta.memberName}` : '',
    meta.projectName ? `Project: ${meta.projectName}` : '',
  ]
    .filter(Boolean)
    .join('   |   ');

  drawPageHeader(doc, 'TIMESHEET REPORT', subtitle, pageW);

  // ── Table ────────────────────────────────────────────────────────────────────
  const cols = [
    { header: '#', key: '_no', width: 24, align: 'center' as const },
    { header: 'Date / Ngày', key: 'entryDate', width: 72 },
    { header: 'Member / Thành viên', key: 'displayName', width: 115 },
    { header: 'Project', key: 'projectName', width: 150 },
    { header: 'Work Type', key: 'workTypeName', width: 110 },
    { header: 'Hours', key: 'hours', width: 45, align: 'right' as const },
    { header: 'Description', key: 'description', width: 280 },
  ];

  const tableRows = entries.map((e, idx) => ({
    ...e,
    _no: idx + 1,
    workTypeName: e.workTypeName ?? '—',
    description: e.description ?? '',
    hours: Number(e.hours).toFixed(2),
  }));

  const startX = MARGIN;
  let finalY = drawTable(
    doc,
    cols,
    tableRows as unknown as Record<string, unknown>[],
    startX,
    doc.y,
    18,
    22,
    7.5,
  );

  // ── Summary footer ────────────────────────────────────────────────────────────
  finalY += 8;
  const totalHours = entries.reduce((s, e) => s + Number(e.hours), 0);

  const summaryW = 250;
  const summaryX = pageW - MARGIN - summaryW;

  doc.rect(summaryX, finalY, summaryW, 20).fill(C.tableHeaderBg);
  doc
    .font(FONT_BOLD())
    .fontSize(8)
    .fillColor(C.headerText)
    .text(
      'Thời gian thực hiện (giờ) / Total Hours:',
      summaryX + 4,
      finalY + 5,
      { width: summaryW - 60, lineBreak: false },
    );
  doc
    .font(FONT_BOLD())
    .fontSize(10)
    .fillColor(C.accent)
    .text(totalHours.toFixed(2), summaryX + summaryW - 55, finalY + 4, {
      width: 50,
      align: 'right',
      lineBreak: false,
    });

  doc.rect(summaryX, finalY, summaryW, 20).stroke(C.border).lineWidth(0.5);
  finalY += 20;

  // Row count note
  doc
    .font(FONT_BODY())
    .fontSize(7)
    .fillColor(C.muted)
    .text(`Total entries: ${entries.length}`, MARGIN, finalY + 4);

  // ── Page numbers ────────────────────────────────────────────────────────────
  addPageNumbers(doc, pageW, pageH);

  doc.end();
}
