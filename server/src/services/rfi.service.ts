/**
 * rfi.service.ts — Business logic for RFI (Request for Information) management.
 *
 * Visibility invariant: users may only access RFIs within projects they are members of.
 * Every operation checks project membership before proceeding.
 */

import { unlink } from 'fs/promises';
import { join } from 'path';

import { AppError } from '../middleware/errorHandler.js';
import { isProjectMember } from '../models/project.model.js';
import * as rfiModel from '../models/rfi.model.js';
import type {
  Rfi,
  RfiRow,
  RfiDetail,
  RfiComment,
  RfiActivity,
  RfiImage,
  RfiProjectStats,
  ListRfisFilters,
} from '../models/rfi.model.js';

export type { Rfi, RfiRow, RfiDetail, RfiComment, RfiActivity, RfiImage, RfiProjectStats, ListRfisFilters };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function assertProjectMember(projectId: number, userId: number): Promise<void> {
  const member = await isProjectMember(projectId, userId);
  if (!member) {
    throw new AppError(403, 'UNAUTHORIZED', 'You do not have access to this project');
  }
}

async function assertRfiExists(rfiId: number): Promise<RfiDetail> {
  const rfi = await rfiModel.findById(rfiId);
  if (!rfi) {
    throw new AppError(404, 'NOT_FOUND', 'RFI not found');
  }
  return rfi;
}

// ---------------------------------------------------------------------------
// RFI operations
// ---------------------------------------------------------------------------

export async function listRfis(
  projectId: number,
  userId: number,
  filters?: ListRfisFilters,
): Promise<RfiRow[]> {
  await assertProjectMember(projectId, userId);
  return rfiModel.findAllByProject(projectId, filters);
}

export async function getRfi(rfiId: number, userId: number): Promise<RfiDetail> {
  const rfi = await assertRfiExists(rfiId);
  await assertProjectMember(rfi.projectId, userId);
  return rfi;
}

export async function createRfi(
  projectId: number,
  userId: number,
  data: {
    title: string;
    discipline: string;
    priority: string;
    submittedBy: string;
    assignedTo?: string | null;
    drawingRef?: string | null;
    specRef?: string | null;
    dateSubmitted?: string;
    requiredDate?: string | null;
    description: string;
  },
): Promise<Rfi> {
  await assertProjectMember(projectId, userId);

  const year = data.dateSubmitted
    ? new Date(data.dateSubmitted).getFullYear()
    : new Date().getFullYear();

  const rfiNumber = await rfiModel.getNextRfiNumber(projectId, year);

  const createPayload: Parameters<typeof rfiModel.create>[0] = {
    projectId,
    rfiNumber,
    title: data.title,
    discipline: data.discipline,
    priority: data.priority,
    status: 'Open',
    submittedBy: data.submittedBy,
    assignedTo: data.assignedTo ?? null,
    drawingRef: data.drawingRef ?? null,
    specRef: data.specRef ?? null,
    requiredDate: data.requiredDate ?? null,
    description: data.description,
    createdBy: userId,
  };
  if (data.dateSubmitted !== undefined) {
    createPayload.dateSubmitted = data.dateSubmitted;
  }
  const rfi = await rfiModel.create(createPayload);

  await rfiModel.addActivity(rfi.id, userId, 'RFI submitted');

  return rfi;
}

export async function updateRfi(
  rfiId: number,
  userId: number,
  data: Partial<{
    title: string;
    discipline: string;
    priority: string;
    status: string;
    submittedBy: string;
    assignedTo: string | null;
    drawingRef: string | null;
    specRef: string | null;
    requiredDate: string | null;
    responseDate: string | null;
    description: string;
    response: string | null;
  }>,
): Promise<Rfi> {
  const existing = await assertRfiExists(rfiId);
  await assertProjectMember(existing.projectId, userId);

  // Log status change
  if (data.status && data.status !== existing.status) {
    await rfiModel.addActivity(
      rfiId,
      userId,
      `Status changed from "${existing.status}" to "${data.status}"`,
    );
    // Auto-set responseDate when transitioning to Responded
    if (data.status === 'Responded' && !data.responseDate && !existing.responseDate) {
      const today = new Date().toISOString().slice(0, 10);
      data = { ...data, responseDate: today };
      await rfiModel.addActivity(rfiId, userId, 'Response issued');
    }
  }

  const updated = await rfiModel.update(rfiId, data);
  if (!updated) {
    throw new AppError(404, 'NOT_FOUND', 'RFI not found');
  }

  return updated;
}

export async function deleteRfi(rfiId: number, userId: number): Promise<void> {
  const existing = await assertRfiExists(rfiId);
  await assertProjectMember(existing.projectId, userId);
  await rfiModel.remove(rfiId);
}

// ---------------------------------------------------------------------------
// Comment operations
// ---------------------------------------------------------------------------

export async function addComment(
  rfiId: number,
  userId: number,
  body: string,
): Promise<RfiComment> {
  const rfi = await assertRfiExists(rfiId);
  await assertProjectMember(rfi.projectId, userId);

  const comment = await rfiModel.addComment(rfiId, userId, body);
  await rfiModel.addActivity(rfiId, userId, 'Comment added');
  return comment;
}

export async function deleteComment(
  commentId: number,
  rfiId: number,
  userId: number,
): Promise<void> {
  const rfi = await assertRfiExists(rfiId);
  await assertProjectMember(rfi.projectId, userId);
  await rfiModel.removeComment(commentId);
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function getProjectStats(
  projectId: number,
  userId: number,
): Promise<RfiProjectStats> {
  await assertProjectMember(projectId, userId);
  return rfiModel.getProjectStats(projectId);
}

// ---------------------------------------------------------------------------
// Image operations
// ---------------------------------------------------------------------------

const MAX_IMAGES_PER_RFI = 6;
// Uploads live one level above server/ at the project root: <root>/uploads/rfi/
const UPLOADS_DIR = join(process.cwd(), '..', 'uploads', 'rfi');

export async function addImage(
  rfiId: number,
  userId: number,
  fileData: {
    filename: string;
    storagePath: string;
    mimeType?: string;
    fileSize?: number;
    commentId?: number | null;
  },
): Promise<RfiImage> {
  const rfi = await assertRfiExists(rfiId);
  await assertProjectMember(rfi.projectId, userId);

  // Enforce max 6 images per RFI (comment images are not counted against the limit)
  if (!fileData.commentId) {
    const count = await rfiModel.countImagesByRfi(rfiId);
    if (count >= MAX_IMAGES_PER_RFI) {
      throw new AppError(422, 'VALIDATION_ERROR', `Maximum ${MAX_IMAGES_PER_RFI} images per RFI`);
    }
  }

  return rfiModel.insertImage({
    rfiId,
    commentId: fileData.commentId ?? null,
    filename: fileData.filename,
    storagePath: fileData.storagePath,
    mimeType: fileData.mimeType ?? null,
    fileSize: fileData.fileSize ?? null,
    uploadedBy: userId,
  });
}

export async function removeImage(
  rfiId: number,
  imageId: number,
  userId: number,
): Promise<void> {
  const rfi = await assertRfiExists(rfiId);
  await assertProjectMember(rfi.projectId, userId);

  const deleted = await rfiModel.removeImage(imageId);
  if (!deleted) {
    throw new AppError(404, 'NOT_FOUND', 'Image not found');
  }

  // Delete the physical file — failure here is non-fatal (file may already be gone)
  try {
    await unlink(join(UPLOADS_DIR, deleted.filename));
  } catch {
    // Intentionally swallowed — orphaned file is a maintenance concern, not a request error
  }
}
