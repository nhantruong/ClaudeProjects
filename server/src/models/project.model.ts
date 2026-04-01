/**
 * project.model.ts — Raw SQL query functions for the projects and
 * project_members tables.
 *
 * This module is the only place that talks to these tables.
 * No business logic lives here — only parameterised SQL queries.
 *
 * SECURITY: All inputs are passed via named parameters — never string-concatenated.
 */

import { query, sql } from '../lib/db.js';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type ProjectDomain = 'electromechanical' | 'bim' | 'software' | 'other';
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectMemberRole = 'manager' | 'member';

export interface Project {
  id: number;
  name: string;
  description: string | null;
  domain: ProjectDomain;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary extends Project {
  memberCount: number;
  taskCount: number;
}

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  role: ProjectMemberRole;
  joinedAt: string;
}

export interface ProjectMemberDetail {
  userId: number;
  displayName: string;
  username: string;
  role: ProjectMemberRole;
  joinedAt: string;
}

// ---------------------------------------------------------------------------
// DB row shapes (snake_case from SQL Server)
// ---------------------------------------------------------------------------

interface ProjectRow {
  id: number;
  name: string;
  description: string | null;
  domain: ProjectDomain;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

interface ProjectSummaryRow extends ProjectRow {
  member_count: number;
  task_count: number;
}

interface ProjectMemberRow {
  id: number;
  project_id: number;
  user_id: number;
  role: ProjectMemberRole;
  joined_at: string;
}

interface ProjectMemberDetailRow {
  user_id: number;
  display_name: string;
  username: string;
  role: ProjectMemberRole;
  joined_at: string;
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    domain: row.domain,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToProjectSummary(row: ProjectSummaryRow): ProjectSummary {
  return {
    ...rowToProject(row),
    memberCount: row.member_count,
    taskCount: row.task_count,
  };
}

function rowToProjectMember(row: ProjectMemberRow): ProjectMember {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
  };
}

function rowToProjectMemberDetail(row: ProjectMemberDetailRow): ProjectMemberDetail {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    username: row.username,
    role: row.role,
    joinedAt: row.joined_at,
  };
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/**
 * listProjectsForUser — returns all projects the user is a member of,
 * with member count and task count. Cancelled projects excluded.
 * Ordered by most-recently-updated first (FR-013).
 */
export async function listProjectsForUser(userId: number): Promise<ProjectSummary[]> {
  const rows = await query<ProjectSummaryRow>(
    `SELECT
       p.id, p.name, p.description, p.domain, p.status,
       p.start_date, p.end_date, p.created_by,
       p.created_at, p.updated_at,
       (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id) AS member_count,
       (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS task_count
     FROM projects p
     INNER JOIN project_members pm ON pm.project_id = p.id
     WHERE pm.user_id = @userId
       AND p.status NOT IN (N'cancelled')
     ORDER BY p.updated_at DESC`,
    { userId: { type: sql.Int, value: userId } },
  );

  return rows.map(rowToProjectSummary);
}

/**
 * getProjectById — fetch a single project by its primary key.
 * Returns null if not found.
 */
export async function getProjectById(id: number): Promise<Project | null> {
  const rows = await query<ProjectRow>(
    `SELECT id, name, description, domain, status,
            start_date, end_date, created_by, created_at, updated_at
     FROM projects
     WHERE id = @id`,
    { id: { type: sql.Int, value: id } },
  );

  return rows.length > 0 ? rowToProject(rows[0]!) : null;
}

/**
 * isProjectMember — returns true if the user is a member of the project.
 */
export async function isProjectMember(projectId: number, userId: number): Promise<boolean> {
  const rows = await query<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt
     FROM project_members
     WHERE project_id = @projectId AND user_id = @userId`,
    {
      projectId: { type: sql.Int, value: projectId },
      userId: { type: sql.Int, value: userId },
    },
  );

  return (rows[0]?.cnt ?? 0) > 0;
}

/**
 * getProjectMemberRole — returns the project-level role of a user,
 * or null if they are not a member.
 */
export async function getProjectMemberRole(
  projectId: number,
  userId: number,
): Promise<ProjectMemberRole | null> {
  const rows = await query<{ role: ProjectMemberRole }>(
    `SELECT role
     FROM project_members
     WHERE project_id = @projectId AND user_id = @userId`,
    {
      projectId: { type: sql.Int, value: projectId },
      userId: { type: sql.Int, value: userId },
    },
  );

  return rows[0]?.role ?? null;
}

/**
 * createProject — inserts a new project row and returns the created record.
 */
export async function createProject(data: {
  name: string;
  description?: string;
  domain: ProjectDomain;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  createdBy: number;
}): Promise<Project> {
  const rows = await query<ProjectRow>(
    `INSERT INTO projects (name, description, domain, status, start_date, end_date, created_by)
     OUTPUT
       INSERTED.id, INSERTED.name, INSERTED.description, INSERTED.domain, INSERTED.status,
       INSERTED.start_date, INSERTED.end_date, INSERTED.created_by,
       INSERTED.created_at, INSERTED.updated_at
     VALUES (@name, @description, @domain, @status, @startDate, @endDate, @createdBy)`,
    {
      name: { type: sql.NVarChar(200), value: data.name },
      description: { type: sql.NVarChar(sql.MAX), value: data.description ?? null },
      domain: { type: sql.NVarChar(50), value: data.domain },
      status: { type: sql.NVarChar(30), value: data.status },
      startDate: { type: sql.Date, value: data.startDate ?? null },
      endDate: { type: sql.Date, value: data.endDate ?? null },
      createdBy: { type: sql.Int, value: data.createdBy },
    },
  );

  if (!rows[0]) {
    throw new Error('createProject: INSERT did not return a row');
  }

  return rowToProject(rows[0]);
}

/**
 * updateProject — applies partial updates to a project row.
 * Only the provided fields are changed; updated_at is always bumped.
 *
 * Uses dynamic SQL built from an explicit allowlist — no user-controlled
 * column names ever enter the query string.
 */
export async function updateProject(
  id: number,
  data: Partial<{
    name: string;
    description: string | null;
    domain: ProjectDomain;
    status: ProjectStatus;
    startDate: string | null;
    endDate: string | null;
  }>,
): Promise<Project> {
  // Build the SET clause from an explicit allowlist — never from user input directly
  const setClauses: string[] = ['updated_at = GETUTCDATE()'];
  const inputs: Record<string, { type: sql.ISqlTypeFactory; value: unknown }> = {
    id: { type: sql.Int, value: id },
  };

  if (data.name !== undefined) {
    setClauses.push('name = @name');
    inputs['name'] = { type: sql.NVarChar(200), value: data.name };
  }
  if ('description' in data) {
    setClauses.push('description = @description');
    inputs['description'] = { type: sql.NVarChar(sql.MAX), value: data.description };
  }
  if (data.domain !== undefined) {
    setClauses.push('domain = @domain');
    inputs['domain'] = { type: sql.NVarChar(50), value: data.domain };
  }
  if (data.status !== undefined) {
    setClauses.push('status = @status');
    inputs['status'] = { type: sql.NVarChar(30), value: data.status };
  }
  if ('startDate' in data) {
    setClauses.push('start_date = @startDate');
    inputs['startDate'] = { type: sql.Date, value: data.startDate };
  }
  if ('endDate' in data) {
    setClauses.push('end_date = @endDate');
    inputs['endDate'] = { type: sql.Date, value: data.endDate };
  }

  const rows = await query<ProjectRow>(
    `UPDATE projects
     SET ${setClauses.join(', ')}
     OUTPUT
       INSERTED.id, INSERTED.name, INSERTED.description, INSERTED.domain, INSERTED.status,
       INSERTED.start_date, INSERTED.end_date, INSERTED.created_by,
       INSERTED.created_at, INSERTED.updated_at
     WHERE id = @id`,
    inputs,
  );

  if (!rows[0]) {
    throw new Error('updateProject: UPDATE did not return a row');
  }

  return rowToProject(rows[0]);
}

/**
 * deleteProject — permanently deletes a project row.
 * Cascade deletes project_members. Tasks must be handled by the application
 * before calling this (no DB-level cascade on tasks → projects FK).
 */
export async function deleteProject(id: number): Promise<void> {
  await query(
    `DELETE FROM projects WHERE id = @id`,
    { id: { type: sql.Int, value: id } },
  );
}

/**
 * addMember — inserts a project_members row.
 * Caller must verify the user is not already a member (avoid duplicate key).
 */
export async function addMember(
  projectId: number,
  userId: number,
  role: ProjectMemberRole,
): Promise<ProjectMember> {
  const rows = await query<ProjectMemberRow>(
    `INSERT INTO project_members (project_id, user_id, role)
     OUTPUT
       INSERTED.id, INSERTED.project_id, INSERTED.user_id,
       INSERTED.role, INSERTED.joined_at
     VALUES (@projectId, @userId, @role)`,
    {
      projectId: { type: sql.Int, value: projectId },
      userId: { type: sql.Int, value: userId },
      role: { type: sql.NVarChar(20), value: role },
    },
  );

  if (!rows[0]) {
    throw new Error('addMember: INSERT did not return a row');
  }

  return rowToProjectMember(rows[0]);
}

/**
 * removeMember — deletes the project_members row for the given user.
 */
export async function removeMember(projectId: number, userId: number): Promise<void> {
  await query(
    `DELETE FROM project_members
     WHERE project_id = @projectId AND user_id = @userId`,
    {
      projectId: { type: sql.Int, value: projectId },
      userId: { type: sql.Int, value: userId },
    },
  );
}

/**
 * listMembers — returns all members of a project with their user details.
 * Ordered by join date ascending.
 */
export async function listMembers(projectId: number): Promise<ProjectMemberDetail[]> {
  const rows = await query<ProjectMemberDetailRow>(
    `SELECT pm.user_id, u.display_name, u.username, pm.role, pm.joined_at
     FROM project_members pm
     INNER JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = @projectId
     ORDER BY pm.joined_at ASC`,
    { projectId: { type: sql.Int, value: projectId } },
  );

  return rows.map(rowToProjectMemberDetail);
}
