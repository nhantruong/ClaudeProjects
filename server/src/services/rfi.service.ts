/**
 * rfi.service.ts — Business logic for RFI (Request for Information) management.
 *
 * Visibility invariant: users may only access RFIs within projects they are members of.
 * Every operation checks project membership before proceeding.
 */

import { AppError } from '../middleware/errorHandler.js';
import { isProjectMember } from '../models/project.model.js';
import * as rfiModel from '../models/rfi.model.js';
import type {
  Rfi,
  RfiRow,
  RfiDetail,
  RfiComment,
  RfiActivity,
  RfiProjectStats,
  ListRfisFilters,
} from '../models/rfi.model.js';

export type { Rfi, RfiRow, RfiDetail, RfiComment, RfiActivity, RfiProjectStats, ListRfisFilters };

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
