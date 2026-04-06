/**
 * pdf-helpers.ts — Shared PDF layout utilities using pdfkit.
 */
import { existsSync } from 'fs';
import type { Response } from 'express';
import PDFDocument from 'pdfkit';

export { PDFDocument };

// ─── Page constants ───────────────────────────────────────────────────────────
export const MARGIN = 40;
export const A4_W = 595.28;
export const A4_H = 841.89;
export const A4_LAND_W = 841.89;
export const A4_LAND_H = 595.28;

// ─── Colors ───────────────────────────────────────────────────────────────────
export const C = {
  headerBg: '#1C2128',
  headerText: '#E6EDF3',
  headerSub: '#8B949E',
  tableHeaderBg: '#21262D',
  tableHeaderText: '#E6EDF3',
  rowOdd: '#FFFFFF',
  rowEven: '#F6F8FA',
  border: '#D0D7DE',
  text: '#1F2328',
  muted: '#636C76',
  accent: '#14B8A6',
  red: '#DA3633',
  yellow: '#D29922',
  green: '#2EA043',
};

// ─── Font registration ────────────────────────────────────────────────────────
// Use Arial from Windows system fonts — supports Vietnamese diacritics.
// Falls back to built-in Helvetica if not found (ASCII content only).
const WIN_ARIAL = 'C:\\Windows\\Fonts\\arial.ttf';
const WIN_ARIAL_BOLD = 'C:\\Windows\\Fonts\\arialbd.ttf';
export const HAS_VN_FONT = existsSync(WIN_ARIAL);

export function registerFonts(doc: PDFKit.PDFDocument): void {
  if (HAS_VN_FONT) {
    doc.registerFont('Body', WIN_ARIAL);
    doc.registerFont('Bold', WIN_ARIAL_BOLD);
  }
}

export const FONT_BODY = () => (HAS_VN_FONT ? 'Body' : 'Helvetica');
export const FONT_BOLD = () => (HAS_VN_FONT ? 'Bold' : 'Helvetica-Bold');

// ─── Page header ──────────────────────────────────────────────────────────────
export function drawPageHeader(
  doc: PDFKit.PDFDocument,
  title: string,
  subtitle: string,
  pageWidth: number,
): void {
  // Dark header band
  doc.rect(0, 0, pageWidth, 56).fill(C.headerBg);
  // Teal left accent stripe
  doc.rect(0, 0, 4, 56).fill(C.accent);

  doc
    .font(FONT_BOLD())
    .fontSize(14)
    .fillColor(C.headerText)
    .text(title, MARGIN, 12, { width: pageWidth - MARGIN * 2 });
  doc
    .font(FONT_BODY())
    .fontSize(9)
    .fillColor(C.headerSub)
    .text(subtitle, MARGIN, 33, { width: pageWidth - MARGIN * 2 });

  doc.y = 72;
  doc.fillColor(C.text);
}

// ─── Table drawing ────────────────────────────────────────────────────────────
export interface ColDef {
  header: string;
  key: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  color?: (val: unknown) => string | undefined;
}

export function drawTable<T extends Record<string, unknown>>(
  doc: PDFKit.PDFDocument,
  cols: ColDef[],
  rows: T[],
  startX: number,
  startY: number,
  rowH = 18,
  headerH = 22,
  fontSize = 7.5,
): number {
  const totalW = cols.reduce((s, c) => s + c.width, 0);
  let y = startY;
  // Access page height through pdfkit's internal page object
  const pageH = (doc as unknown as { page: { height: number } }).page.height;

  // ── header row ──────────────────────────────────────────────────────────────
  doc.rect(startX, y, totalW, headerH).fill(C.tableHeaderBg);

  let cx = startX;
  for (const col of cols) {
    doc
      .font(FONT_BOLD())
      .fontSize(fontSize)
      .fillColor(C.tableHeaderText)
      .text(col.header, cx + 3, y + 5, {
        width: col.width - 6,
        align: col.align ?? 'left',
        lineBreak: false,
      });
    cx += col.width;
  }

  // header border
  doc.rect(startX, y, totalW, headerH).stroke(C.border).lineWidth(0.4);
  // vertical lines
  cx = startX;
  for (const col of cols) {
    cx += col.width;
    doc.moveTo(cx, y).lineTo(cx, y + headerH).stroke(C.border).lineWidth(0.3);
  }

  y += headerH;

  // ── data rows ───────────────────────────────────────────────────────────────
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;

    // page break
    if (y + rowH > pageH - MARGIN - 20) {
      doc.addPage();
      y = MARGIN;
      // re-draw column headers on new page
      doc.rect(startX, y, totalW, headerH).fill(C.tableHeaderBg);
      cx = startX;
      for (const col of cols) {
        doc
          .font(FONT_BOLD())
          .fontSize(fontSize)
          .fillColor(C.tableHeaderText)
          .text(col.header, cx + 3, y + 5, {
            width: col.width - 6,
            align: col.align ?? 'left',
            lineBreak: false,
          });
        cx += col.width;
      }
      doc.rect(startX, y, totalW, headerH).stroke(C.border).lineWidth(0.4);
      y += headerH;
    }

    const bg = i % 2 === 0 ? C.rowOdd : C.rowEven;
    doc.rect(startX, y, totalW, rowH).fill(bg);

    cx = startX;
    for (const col of cols) {
      const raw = row[col.key];
      const text = raw != null ? String(raw) : '';
      const textColor = col.color ? (col.color(raw) ?? C.text) : C.text;
      doc
        .font(FONT_BODY())
        .fontSize(fontSize)
        .fillColor(textColor)
        .text(text, cx + 3, y + 4, {
          width: col.width - 6,
          align: col.align ?? 'left',
          lineBreak: false,
        });
      cx += col.width;
    }

    // row borders
    doc.rect(startX, y, totalW, rowH).stroke(C.border).lineWidth(0.2);
    cx = startX;
    for (const col of cols) {
      cx += col.width;
      doc.moveTo(cx, y).lineTo(cx, y + rowH).stroke(C.border).lineWidth(0.2);
    }

    y += rowH;
  }

  // outer rect
  doc.rect(startX, startY, totalW, y - startY).stroke(C.border).lineWidth(0.5);

  return y; // final Y
}

// ─── Info block ───────────────────────────────────────────────────────────────
/** Two-column key→value info block, used in RFI detail header section. */
export function drawInfoBlock(
  doc: PDFKit.PDFDocument,
  fields: Array<[string, string]>,
  x: number,
  y: number,
  blockWidth: number,
): number {
  const rowH = 16;
  const labelW = 110;
  const valueW = blockWidth - labelW;
  const totalH = fields.length * rowH;

  doc.rect(x, y, blockWidth, totalH).stroke(C.border).lineWidth(0.4);

  for (let i = 0; i < fields.length; i++) {
    const [label, value] = fields[i]!;
    const ry = y + i * rowH;
    const bg = i % 2 === 0 ? C.rowOdd : C.rowEven;
    doc.rect(x, ry, blockWidth, rowH).fill(bg);

    doc
      .font(FONT_BOLD())
      .fontSize(7.5)
      .fillColor(C.muted)
      .text(label, x + 4, ry + 4, { width: labelW - 8, lineBreak: false });
    doc
      .font(FONT_BODY())
      .fontSize(7.5)
      .fillColor(C.text)
      .text(value, x + labelW + 2, ry + 4, { width: valueW - 4, lineBreak: false });

    // divider
    doc
      .moveTo(x, ry + rowH)
      .lineTo(x + blockWidth, ry + rowH)
      .stroke(C.border)
      .lineWidth(0.2);
    doc
      .moveTo(x + labelW, ry)
      .lineTo(x + labelW, ry + rowH)
      .stroke(C.border)
      .lineWidth(0.2);
  }

  return y + totalH + 8;
}

// ─── Footer ───────────────────────────────────────────────────────────────────
export function addPageNumbers(
  doc: PDFKit.PDFDocument,
  pageWidth: number,
  pageHeight: number,
): void {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc
      .font(FONT_BODY())
      .fontSize(7)
      .fillColor(C.muted)
      .text(
        `Page ${i + 1} of ${range.count}   •   Generated ${new Date().toLocaleString('en-GB')}`,
        MARGIN,
        pageHeight - 20,
        { width: pageWidth - MARGIN * 2, align: 'center', lineBreak: false },
      );
  }
}

// Suppress unused import warning for Response — it is part of the public API
// surface used by callers of this module.
export type { Response };
