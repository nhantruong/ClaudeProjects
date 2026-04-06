/**
 * rfi.model.ts — Raw SQL query functions for the rfis, rfi_comments, and
 * rfi_activity tables.
 *
 * This module is the only place that talks to these tables.
 * No business logic lives here — only parameterised SQL queries.
 *
 * SECURITY: All inputs are passed via named parameters — never string-concatenated.
 * Dynamic SET clauses are built from an explicit developer-controlled allowlist,
 * never from user-supplied column names.
 */

import { query, sql } from '../lib/db.js';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface Rfi {
  id: number;
  projectId: number;
  rfiNumber: string;
  title: string;
  discipline: string;
  priority: string;
  status: string;
  submittedBy: string;
  assignedTo: string | null;
  drawingRef: string | null;
  specRef: string | null;
  dateSubmitted: string;
  requiredDate: string | null;
  responseDate: string | null;
  description: string;
  response: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface RfiComment {
  id: number;
  rfiId: number;
  userId: number;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface RfiActivity {
  id: number;
  rfiId: number;
  userId: number | null;
  event: string;
  createdAt: string;
}

export type RfiRow = Rfi & { commentCount: number };
export type RfiDetail = Rfi & { comments: RfiComment[]; activity: RfiActivity[]; images: RfiImage[] };

export interface RfiProjectStats {
  total: number;
  open: number;
  underReview: number;
  responded: number;
  closed: number;
  overdue: number;
  avgResponseDays: number | null;
  slaCompliant: number;
  slaTotal: number;
}

// ---------------------------------------------------------------------------
// DB row shapes (snake_case from SQL Server)
// ---------------------------------------------------------------------------

interface RfiDbRow {
  id: number;
  project_id: number;
  rfi_number: string;
  title: string;
  discipline: string;
  priority: string;
  status: string;
  submitted_by: string;
  assigned_to: string | null;
  drawing_ref: string | null;
  spec_ref: string | null;
  date_submitted: string;
  required_date: string | null;
  response_date: string | null;
  description: string;
  response: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

interface RfiListDbRow extends RfiDbRow {
  comment_count: number;
}

interface RfiCommentDbRow {
  id: number;
  rfi_id: number;
  user_id: number;
  author_name: string;
  body: string;
  created_at: string;
  updated_at: string;
}

interface RfiActivityDbRow {
  id: number;
  rfi_id: number;
  user_id: number | null;
  event: string;
  created_at: string;
}

interface RfiStatsDbRow {
  total: number;
  open: number;
  under_review: number;
  responded: number;
  closed: number;
  overdue: number;
  avg_response_days: number | null;
  sla_compliant: number;
  sla_total: number;
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function rowToRfi(row: RfiDbRow): Rfi {
  return {
    id: row.id,
    projectId: row.project_id,
    rfiNumber: row.rfi_number,
    title: row.title,
    discipline: row.discipline,
    priority: row.priority,
    status: row.status,
    submittedBy: row.submitted_by,
    assignedTo: row.assigned_to,
    drawingRef: row.drawing_ref,
    specRef: row.spec_ref,
    dateSubmitted: row.date_submitted,
    requiredDate: row.required_date,
    responseDate: row.response_date,
    description: row.description,
    response: row.response,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToRfiRow(row: RfiListDbRow): RfiRow {
  return {
    ...rowToRfi(row),
    commentCount: row.comment_count,
  };
}

function rowToComment(row: RfiCommentDbRow): RfiComment {
  return {
    id: row.id,
    rfiId: row.rfi_id,
    userId: row.user_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToActivity(row: RfiActivityDbRow): RfiActivity {
  return {
    id: row.id,
    rfiId: row.rfi_id,
    userId: row.user_id,
    event: row.event,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// RFI query functions
// ---------------------------------------------------------------------------

export interface ListRfisFilters {
  status?: string;
  discipline?: string;
  priority?: string;
}

/**
 * findAllByProject — returns all RFIs for a project with comment counts.
 * Supports optional filters on status, discipline, and priority.
 * Ordered by date_submitted descending (most recent first).
 */
export async function findAllByProject(
  projectId: number,
  filters?: ListRfisFilters,
): Promise<RfiRow[]> {
  const inputs: Record<string, { type: sql.ISqlTypeFactory; value: unknown }> = {
    projectId: { type: sql.Int, value: projectId },
  };

  const whereClauses: string[] = ['r.project_id = @projectId'];

  if (filters?.status !== undefined) {
    whereClauses.push('r.status = @status');
    inputs['status'] = { type: sql.NVarChar(30), value: filters.status };
  }
  if (filters?.discipline !== undefined) {
    whereClauses.push('r.discipline = @discipline');
    inputs['discipline'] = { type: sql.NVarChar(50), value: filters.discipline };
  }
  if (filters?.priority !== undefined) {
    whereClauses.push('r.priority = @priority');
    inputs['priority'] = { type: sql.NVarChar(20), value: filters.priority };
  }

  const rows = await query<RfiListDbRow>(
    `SELECT
       r.id, r.project_id, r.rfi_number, r.title, r.discipline,
       r.priority, r.status, r.submitted_by, r.assigned_to,
       r.drawing_ref, r.spec_ref, r.date_submitted, r.required_date,
       r.response_date, r.description, r.response,
       r.created_by, r.created_at, r.updated_at,
       COUNT(rc.id) AS comment_count
     FROM rfis r
     LEFT JOIN rfi_comments rc ON rc.rfi_id = r.id
     WHERE ${whereClauses.join(' AND ')}
     GROUP BY
       r.id, r.project_id, r.rfi_number, r.title, r.discipline,
       r.priority, r.status, r.submitted_by, r.assigned_to,
       r.drawing_ref, r.spec_ref, r.date_submitted, r.required_date,
       r.response_date, r.description, r.response,
       r.created_by, r.created_at, r.updated_at
     ORDER BY r.date_submitted DESC`,
    inputs,
  );

  return rows.map(rowToRfiRow);
}

/**
 * findById — returns a single RFI with its full comment and activity history.
 * Returns null if the RFI does not exist.
 */
export async function findById(id: number): Promise<RfiDetail | null> {
  const rfiRows = await query<RfiDbRow>(
    `SELECT
       id, project_id, rfi_number, title, discipline, priority, status,
       submitted_by, assigned_to, drawing_ref, spec_ref, date_submitted,
       required_date, response_date, description, response,
       created_by, created_at, updated_at
     FROM rfis
     WHERE id = @id`,
    { id: { type: sql.Int, value: id } },
  );

  if (rfiRows.length === 0) {
    return null;
  }

  const rfi = rowToRfi(rfiRows[0]!);

  // Fetch comments with author display name, chronological order
  const commentRows = await query<RfiCommentDbRow>(
    `SELECT
       rc.id, rc.rfi_id, rc.user_id,
       u.display_name AS author_name,
       rc.body, rc.created_at, rc.updated_at
     FROM rfi_comments rc
     INNER JOIN users u ON u.id = rc.user_id
     WHERE rc.rfi_id = @rfiId
     ORDER BY rc.created_at ASC`,
    { rfiId: { type: sql.Int, value: id } },
  );

  // Fetch activity log in chronological order
  const activityRows = await query<RfiActivityDbRow>(
    `SELECT id, rfi_id, user_id, event, created_at
     FROM rfi_activity
     WHERE rfi_id = @rfiId
     ORDER BY created_at ASC`,
    { rfiId: { type: sql.Int, value: id } },
  );

  const imageRows = await findImagesByRfi(id);

  return {
    ...rfi,
    comments: commentRows.map(rowToComment),
    activity: activityRows.map(rowToActivity),
    images: imageRows,
  };
}

/**
 * create — inserts a new RFI row and returns the created record.
 * Uses OUTPUT INSERTED.* to return the persisted row in a single round-trip.
 */
export async function create(data: {
  projectId: number;
  rfiNumber: string;
  title: string;
  discipline: string;
  priority: string;
  status: string;
  submittedBy: string;
  assignedTo?: string | null;
  drawingRef?: string | null;
  specRef?: string | null;
  dateSubmitted?: string;
  requiredDate?: string | null;
  description: string;
  createdBy: number;
}): Promise<Rfi> {
  const rows = await query<RfiDbRow>(
    `INSERT INTO rfis (
       project_id, rfi_number, title, discipline, priority, status,
       submitted_by, assigned_to, drawing_ref, spec_ref,
       date_submitted, required_date, description, created_by
     )
     OUTPUT
       INSERTED.id, INSERTED.project_id, INSERTED.rfi_number, INSERTED.title,
       INSERTED.discipline, INSERTED.priority, INSERTED.status,
       INSERTED.submitted_by, INSERTED.assigned_to, INSERTED.drawing_ref,
       INSERTED.spec_ref, INSERTED.date_submitted, INSERTED.required_date,
       INSERTED.response_date, INSERTED.description, INSERTED.response,
       INSERTED.created_by, INSERTED.created_at, INSERTED.updated_at
     VALUES (
       @projectId, @rfiNumber, @title, @discipline, @priority, @status,
       @submittedBy, @assignedTo, @drawingRef, @specRef,
       @dateSubmitted, @requiredDate, @description, @createdBy
     )`,
    {
      projectId:     { type: sql.Int,           value: data.projectId },
      rfiNumber:     { type: sql.NVarChar(20),  value: data.rfiNumber },
      title:         { type: sql.NVarChar(300), value: data.title },
      discipline:    { type: sql.NVarChar(50),  value: data.discipline },
      priority:      { type: sql.NVarChar(20),  value: data.priority },
      status:        { type: sql.NVarChar(30),  value: data.status },
      submittedBy:   { type: sql.NVarChar(200), value: data.submittedBy },
      assignedTo:    { type: sql.NVarChar(200), value: data.assignedTo ?? null },
      drawingRef:    { type: sql.NVarChar(200), value: data.drawingRef ?? null },
      specRef:       { type: sql.NVarChar(100), value: data.specRef ?? null },
      dateSubmitted: { type: sql.Date,          value: data.dateSubmitted ?? null },
      requiredDate:  { type: sql.Date,          value: data.requiredDate ?? null },
      description:   { type: sql.NVarChar(sql.MAX), value: data.description },
      createdBy:     { type: sql.Int,           value: data.createdBy },
    },
  );

  if (!rows[0]) {
    throw new Error('create: RFI INSERT did not return a row');
  }

  return rowToRfi(rows[0]);
}

/**
 * update — applies partial updates to an RFI row.
 * Only supplied (non-undefined) fields are changed; updated_at is always bumped.
 * Dynamic SET clause is built from a developer-controlled allowlist.
 * Returns null if the RFI does not exist.
 */
export async function update(
  id: number,
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
): Promise<Rfi | null> {
  const setClauses: string[] = ['updated_at = GETUTCDATE()'];
  const inputs: Record<string, { type: sql.ISqlTypeFactory; value: unknown }> = {
    id: { type: sql.Int, value: id },
  };

  if (data.title !== undefined) {
    setClauses.push('title = @title');
    inputs['title'] = { type: sql.NVarChar(300), value: data.title };
  }
  if (data.discipline !== undefined) {
    setClauses.push('discipline = @discipline');
    inputs['discipline'] = { type: sql.NVarChar(50), value: data.discipline };
  }
  if (data.priority !== undefined) {
    setClauses.push('priority = @priority');
    inputs['priority'] = { type: sql.NVarChar(20), value: data.priority };
  }
  if (data.status !== undefined) {
    setClauses.push('status = @status');
    inputs['status'] = { type: sql.NVarChar(30), value: data.status };
  }
  if (data.submittedBy !== undefined) {
    setClauses.push('submitted_by = @submittedBy');
    inputs['submittedBy'] = { type: sql.NVarChar(200), value: data.submittedBy };
  }
  if ('assignedTo' in data) {
    setClauses.push('assigned_to = @assignedTo');
    inputs['assignedTo'] = { type: sql.NVarChar(200), value: data.assignedTo };
  }
  if ('drawingRef' in data) {
    setClauses.push('drawing_ref = @drawingRef');
    inputs['drawingRef'] = { type: sql.NVarChar(200), value: data.drawingRef };
  }
  if ('specRef' in data) {
    setClauses.push('spec_ref = @specRef');
    inputs['specRef'] = { type: sql.NVarChar(100), value: data.specRef };
  }
  if ('requiredDate' in data) {
    setClauses.push('required_date = @requiredDate');
    inputs['requiredDate'] = { type: sql.Date, value: data.requiredDate };
  }
  if ('responseDate' in data) {
    setClauses.push('response_date = @responseDate');
    inputs['responseDate'] = { type: sql.Date, value: data.responseDate };
  }
  if (data.description !== undefined) {
    setClauses.push('description = @description');
    inputs['description'] = { type: sql.NVarChar(sql.MAX), value: data.description };
  }
  if ('response' in data) {
    setClauses.push('response = @response');
    inputs['response'] = { type: sql.NVarChar(sql.MAX), value: data.response };
  }

  const rows = await query<RfiDbRow>(
    `UPDATE rfis
     SET ${setClauses.join(', ')}
     OUTPUT
       INSERTED.id, INSERTED.project_id, INSERTED.rfi_number, INSERTED.title,
       INSERTED.discipline, INSERTED.priority, INSERTED.status,
       INSERTED.submitted_by, INSERTED.assigned_to, INSERTED.drawing_ref,
       INSERTED.spec_ref, INSERTED.date_submitted, INSERTED.required_date,
       INSERTED.response_date, INSERTED.description, INSERTED.response,
       INSERTED.created_by, INSERTED.created_at, INSERTED.updated_at
     WHERE id = @id`,
    inputs,
  );

  return rows[0] ? rowToRfi(rows[0]) : null;
}

/**
 * remove — permanently deletes an RFI row.
 * Cascade at the DB level removes all rfi_comments and rfi_activity rows.
 * Returns true if a row was deleted, false if the RFI was not found.
 */
export async function remove(id: number): Promise<boolean> {
  const rows = await query<{ rows_affected: number }>(
    `DELETE FROM rfis
     OUTPUT 1 AS rows_affected
     WHERE id = @id`,
    { id: { type: sql.Int, value: id } },
  );

  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Comment query functions
// ---------------------------------------------------------------------------

/**
 * addComment — inserts a new rfi_comments row.
 * Returns the created comment including the author's display name.
 */
export async function addComment(
  rfiId: number,
  userId: number,
  body: string,
): Promise<RfiComment> {
  const rows = await query<RfiCommentDbRow>(
    `INSERT INTO rfi_comments (rfi_id, user_id, body)
     OUTPUT
       INSERTED.id, INSERTED.rfi_id, INSERTED.user_id,
       (SELECT display_name FROM users WHERE id = INSERTED.user_id) AS author_name,
       INSERTED.body, INSERTED.created_at, INSERTED.updated_at
     VALUES (@rfiId, @userId, @body)`,
    {
      rfiId:  { type: sql.Int,              value: rfiId },
      userId: { type: sql.Int,              value: userId },
      body:   { type: sql.NVarChar(sql.MAX), value: body },
    },
  );

  if (!rows[0]) {
    throw new Error('addComment: rfi_comments INSERT did not return a row');
  }

  return rowToComment(rows[0]);
}

/**
 * removeComment — deletes an rfi_comments row by id.
 * Returns true if a row was deleted, false if not found.
 */
export async function removeComment(commentId: number): Promise<boolean> {
  const rows = await query<{ rows_affected: number }>(
    `DELETE FROM rfi_comments
     OUTPUT 1 AS rows_affected
     WHERE id = @id`,
    { id: { type: sql.Int, value: commentId } },
  );

  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Activity log query functions
// ---------------------------------------------------------------------------

/**
 * addActivity — inserts a new rfi_activity row.
 * userId may be null for system-generated events (e.g. automated SLA alerts).
 * Returns the created activity record.
 */
export async function addActivity(
  rfiId: number,
  userId: number | null,
  event: string,
): Promise<RfiActivity> {
  const rows = await query<RfiActivityDbRow>(
    `INSERT INTO rfi_activity (rfi_id, user_id, event)
     OUTPUT
       INSERTED.id, INSERTED.rfi_id, INSERTED.user_id,
       INSERTED.event, INSERTED.created_at
     VALUES (@rfiId, @userId, @event)`,
    {
      rfiId:  { type: sql.Int,          value: rfiId },
      userId: { type: sql.Int,          value: userId },
      event:  { type: sql.NVarChar(200), value: event },
    },
  );

  if (!rows[0]) {
    throw new Error('addActivity: rfi_activity INSERT did not return a row');
  }

  return rowToActivity(rows[0]);
}

// ---------------------------------------------------------------------------
// RFI number generation
// ---------------------------------------------------------------------------

/**
 * getNextRfiNumber — determines the next sequential RFI number for a project
 * in a given year. Format: 'RFI-{year}-{NNN}' zero-padded to 3 digits.
 *
 * Example: 'RFI-2026-001', 'RFI-2026-002', ...
 *
 * NOTE: This function is not atomic — concurrent inserts in the same
 * project/year could produce duplicate numbers. The UNIQUE constraint on
 * (project_id, rfi_number) will surface the collision; the service layer
 * should retry on a unique constraint violation.
 */
export async function getNextRfiNumber(
  projectId: number,
  year: number,
): Promise<string> {
  const rows = await query<{ next_num: number }>(
    `SELECT COUNT(*) + 1 AS next_num
     FROM rfis
     WHERE project_id = @projectId
       AND YEAR(date_submitted) = @year`,
    {
      projectId: { type: sql.Int, value: projectId },
      year:      { type: sql.Int, value: year },
    },
  );

  const nextNum = rows[0]?.next_num ?? 1;
  const paddedNum = String(nextNum).padStart(3, '0');

  return `RFI-${year}-${paddedNum}`;
}

// ---------------------------------------------------------------------------
// Project statistics
// ---------------------------------------------------------------------------

/**
 * getProjectStats — returns a single-row summary of all RFI counts and SLA
 * metrics for a project in one query.
 *
 * Metrics:
 *   total          — total RFIs in the project
 *   open           — status = 'Open'
 *   underReview    — status = 'Under Review'
 *   responded      — status = 'Responded'
 *   closed         — status = 'Closed'
 *   overdue        — not yet responded/closed AND required_date < today (UTC)
 *   avgResponseDays — average calendar days from date_submitted to response_date
 *                     (NULL when no RFIs have a response_date)
 *   slaCompliant   — count where response_date <= required_date (both non-null)
 *   slaTotal       — count where response_date IS NOT NULL (denominator for SLA %)
 */
export async function getProjectStats(projectId: number): Promise<RfiProjectStats> {
  const rows = await query<RfiStatsDbRow>(
    `SELECT
       COUNT(*)                                                         AS total,
       SUM(CASE WHEN status = N'Open'         THEN 1 ELSE 0 END)       AS [open],
       SUM(CASE WHEN status = N'Under Review' THEN 1 ELSE 0 END)       AS under_review,
       SUM(CASE WHEN status = N'Responded'    THEN 1 ELSE 0 END)       AS responded,
       SUM(CASE WHEN status = N'Closed'       THEN 1 ELSE 0 END)       AS closed,
       SUM(CASE
             WHEN status NOT IN (N'Responded', N'Closed')
              AND required_date IS NOT NULL
              AND required_date < CAST(GETUTCDATE() AS date)
             THEN 1 ELSE 0
           END)                                                         AS overdue,
       AVG(CAST(
         DATEDIFF(day, date_submitted, response_date) AS float
       ))                                                               AS avg_response_days,
       SUM(CASE
             WHEN response_date IS NOT NULL
              AND required_date IS NOT NULL
              AND response_date <= required_date
             THEN 1 ELSE 0
           END)                                                         AS sla_compliant,
       SUM(CASE WHEN response_date IS NOT NULL THEN 1 ELSE 0 END)      AS sla_total
     FROM rfis
     WHERE project_id = @projectId`,
    { projectId: { type: sql.Int, value: projectId } },
  );

  const row = rows[0];

  // COUNT(*) on an empty set returns 0, so rows[0] is always present, but
  // guard defensively to satisfy TypeScript and future callers.
  if (!row) {
    return {
      total: 0, open: 0, underReview: 0, responded: 0,
      closed: 0, overdue: 0, avgResponseDays: null,
      slaCompliant: 0, slaTotal: 0,
    };
  }

  return {
    total:           row.total,
    open:            row.open,
    underReview:     row.under_review,
    responded:       row.responded,
    closed:          row.closed,
    overdue:         row.overdue,
    avgResponseDays: row.avg_response_days,
    slaCompliant:    row.sla_compliant,
    slaTotal:        row.sla_total,
  };
}

// ---------------------------------------------------------------------------
// RFI image query functions
// ---------------------------------------------------------------------------

export interface RfiImage {
  id: number;
  rfiId: number;
  commentId: number | null;
  filename: string;
  storagePath: string;
  mimeType: string | null;
  fileSize: number | null;
  sortOrder: number;
  uploadedBy: number;
  createdAt: string;
}

interface RfiImageDbRow {
  id: number;
  rfi_id: number;
  comment_id: number | null;
  filename: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  sort_order: number;
  uploaded_by: number;
  created_at: string;
}

function rowToImage(row: RfiImageDbRow): RfiImage {
  return {
    id: row.id,
    rfiId: row.rfi_id,
    commentId: row.comment_id,
    filename: row.filename,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    sortOrder: row.sort_order,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

export async function findImagesByRfi(rfiId: number): Promise<RfiImage[]> {
  const rows = await query<RfiImageDbRow>(
    `SELECT id, rfi_id, comment_id, filename, storage_path, mime_type, file_size, sort_order, uploaded_by, created_at
     FROM rfi_images
     WHERE rfi_id = @rfiId
     ORDER BY sort_order ASC, id ASC`,
    { rfiId: { type: sql.Int, value: rfiId } },
  );
  return rows.map(rowToImage);
}

export async function countImagesByRfi(rfiId: number): Promise<number> {
  const rows = await query<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM rfi_images WHERE rfi_id = @rfiId AND comment_id IS NULL`,
    { rfiId: { type: sql.Int, value: rfiId } },
  );
  return rows[0]?.cnt ?? 0;
}

export async function insertImage(data: {
  rfiId: number;
  commentId?: number | null;
  filename: string;
  storagePath: string;
  mimeType?: string | null;
  fileSize?: number | null;
  sortOrder?: number;
  uploadedBy: number;
}): Promise<RfiImage> {
  const rows = await query<RfiImageDbRow>(
    `INSERT INTO rfi_images (rfi_id, comment_id, filename, storage_path, mime_type, file_size, sort_order, uploaded_by)
     OUTPUT INSERTED.id, INSERTED.rfi_id, INSERTED.comment_id, INSERTED.filename,
            INSERTED.storage_path, INSERTED.mime_type, INSERTED.file_size,
            INSERTED.sort_order, INSERTED.uploaded_by, INSERTED.created_at
     VALUES (@rfiId, @commentId, @filename, @storagePath, @mimeType, @fileSize, @sortOrder, @uploadedBy)`,
    {
      rfiId:       { type: sql.Int,           value: data.rfiId },
      commentId:   { type: sql.Int,           value: data.commentId ?? null },
      filename:    { type: sql.NVarChar(255),  value: data.filename },
      storagePath: { type: sql.NVarChar(500),  value: data.storagePath },
      mimeType:    { type: sql.NVarChar(100),  value: data.mimeType ?? null },
      fileSize:    { type: sql.BigInt,         value: data.fileSize ?? null },
      sortOrder:   { type: sql.Int,           value: data.sortOrder ?? 0 },
      uploadedBy:  { type: sql.Int,           value: data.uploadedBy },
    },
  );
  if (!rows[0]) throw new Error('insertImage: INSERT did not return a row');
  return rowToImage(rows[0]);
}

export async function removeImage(id: number): Promise<RfiImage | null> {
  const rows = await query<RfiImageDbRow>(
    `DELETE FROM rfi_images
     OUTPUT DELETED.id, DELETED.rfi_id, DELETED.comment_id, DELETED.filename,
            DELETED.storage_path, DELETED.mime_type, DELETED.file_size,
            DELETED.sort_order, DELETED.uploaded_by, DELETED.created_at
     WHERE id = @id`,
    { id: { type: sql.Int, value: id } },
  );
  return rows[0] ? rowToImage(rows[0]) : null;
}
