/**
 * rfi-detail.pdf.ts — Generates detailed RFI PDF report (one page per RFI).
 * Layout mirrors DetailClash*.rdlc.
 */
import { existsSync } from 'fs';
import { join } from 'path';
import type { Response } from 'express';
import type { RfiDetail } from '../../models/rfi.model.js';
import {
  PDFDocument,
  MARGIN,
  A4_W,
  A4_H,
  C,
  registerFonts,
  FONT_BODY,
  FONT_BOLD,
  drawPageHeader,
  drawInfoBlock,
  addPageNumbers,
} from './pdf-helpers.js';

const UPLOADS_DIR = join(process.cwd(), '..', 'uploads');

export function generateRfiDetailPdf(
  rfi: RfiDetail,
  meta: { projectName: string },
  res: Response,
): void {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'portrait',
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    bufferPages: true,
    autoFirstPage: true,
    info: { Title: `RFI ${rfi.rfiNumber}`, Author: 'Raphael' },
  });

  registerFonts(doc);
  doc.pipe(res);

  const pageW = A4_W;
  const pageH = A4_H;
  const contentW = pageW - MARGIN * 2;

  // ── Page header ────────────────────────────────────────────────────────────
  drawPageHeader(doc, `${rfi.rfiNumber} — ${rfi.title}`, `Project: ${meta.projectName}`, pageW);

  let y = doc.y;

  // ── Info fields ────────────────────────────────────────────────────────────
  const fields: Array<[string, string]> = [
    ['Discipline', rfi.discipline],
    ['Priority', rfi.priority],
    ['Status', rfi.status],
    ['Submitted By', rfi.submittedBy],
    ['Assigned To', rfi.assignedTo ?? '—'],
    ['Date Submitted', rfi.dateSubmitted],
    ['Required Date', rfi.requiredDate ?? '—'],
    ['Response Date', rfi.responseDate ?? '—'],
    ['Drawing Ref', rfi.drawingRef ?? '—'],
    ['Spec Ref', rfi.specRef ?? '—'],
  ];

  y = drawInfoBlock(doc, fields, MARGIN, y, contentW);

  // ── Description ────────────────────────────────────────────────────────────
  doc.font(FONT_BOLD()).fontSize(8).fillColor(C.muted).text('Description:', MARGIN, y);
  y += 12;
  doc
    .font(FONT_BODY())
    .fontSize(8)
    .fillColor(C.text)
    .text(rfi.description || '—', MARGIN, y, { width: contentW });
  y = doc.y + 8;

  // ── Response ───────────────────────────────────────────────────────────────
  doc.font(FONT_BOLD()).fontSize(8).fillColor(C.muted).text('Response:', MARGIN, y);
  y += 12;
  doc
    .font(FONT_BODY())
    .fontSize(8)
    .fillColor(C.text)
    .text(rfi.response || '—', MARGIN, y, { width: contentW });
  y = doc.y + 10;

  // ── Images ─────────────────────────────────────────────────────────────────
  const rfiImages = rfi.images ?? [];
  if (rfiImages.length > 0) {
    // Check page space; add new page if less than 80px remaining
    if (y + 85 > pageH - MARGIN - 20) {
      doc.addPage();
      y = MARGIN;
    }

    doc.font(FONT_BOLD()).fontSize(8).fillColor(C.muted).text('Images:', MARGIN, y);
    y += 14;

    const perRow = Math.min(rfiImages.length, 3);
    const imgW = Math.min(160, (contentW - 8 * (perRow - 1)) / perRow);
    const imgH = imgW * 0.65;

    for (let i = 0; i < rfiImages.length; i++) {
      const img = rfiImages[i]!;
      // storage_path from DB is a relative URL like /uploads/rfi/filename.jpg
      // Convert to filesystem path
      const relPath = img.storagePath.startsWith('/uploads/')
        ? img.storagePath.slice('/uploads/'.length)
        : img.storagePath;
      const fsPath = join(UPLOADS_DIR, relPath);

      const col = i % perRow;
      if (col === 0 && i > 0) {
        y += imgH + 8;
      }

      if (y + imgH > pageH - MARGIN - 20) {
        doc.addPage();
        y = MARGIN;
      }

      const imgX = MARGIN + col * (imgW + 8);

      if (existsSync(fsPath)) {
        try {
          doc.image(fsPath, imgX, y, { width: imgW, height: imgH, cover: [imgW, imgH] });
        } catch {
          // If image fails (corrupt, wrong format), draw placeholder
          doc.rect(imgX, y, imgW, imgH).stroke(C.border);
          doc
            .font(FONT_BODY())
            .fontSize(7)
            .fillColor(C.muted)
            .text('[image error]', imgX + 4, y + imgH / 2 - 4, {
              width: imgW - 8,
              align: 'center',
            });
        }
      } else {
        doc.rect(imgX, y, imgW, imgH).stroke(C.border);
        doc
          .font(FONT_BODY())
          .fontSize(7)
          .fillColor(C.muted)
          .text('[image not found]', imgX + 4, y + imgH / 2 - 4, {
            width: imgW - 8,
            align: 'center',
          });
      }
    }
    y += imgH + 12;
  }

  // ── Comments ───────────────────────────────────────────────────────────────
  if (rfi.comments && rfi.comments.length > 0) {
    if (y + 40 > pageH - MARGIN - 20) {
      doc.addPage();
      y = MARGIN;
    }

    doc.font(FONT_BOLD()).fontSize(8).fillColor(C.muted).text('Comments:', MARGIN, y);
    y += 12;

    for (const comment of rfi.comments) {
      if (y + 30 > pageH - MARGIN - 20) {
        doc.addPage();
        y = MARGIN;
      }

      doc.rect(MARGIN, y, contentW, 1).fill(C.border);
      y += 4;
      doc
        .font(FONT_BOLD())
        .fontSize(7)
        .fillColor(C.accent)
        .text(`${comment.authorName}  `, MARGIN, y, { continued: true });
      doc.font(FONT_BODY()).fontSize(7).fillColor(C.muted).text(comment.createdAt.slice(0, 10));
      y = doc.y + 2;
      doc
        .font(FONT_BODY())
        .fontSize(7.5)
        .fillColor(C.text)
        .text(comment.body, MARGIN, y, { width: contentW });
      y = doc.y + 6;
    }
  }

  addPageNumbers(doc, pageW, pageH);
  doc.end();
}
