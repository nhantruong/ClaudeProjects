import { get, post, patch, del } from '@/lib/api';
import type { Project, ProjectMember } from '@/types';

// ── Users API (used for add-member picker) ─────────────────────────────────────

export interface UserOption {
  id: number;
  username: string;
  displayName: string;
  role: 'admin' | 'manager' | 'member';
  isActive: boolean;
}

export const usersApi = {
  list: () => get<{ users: UserOption[] }>('/users'),
};

// ── Input types ────────────────────────────────────────────────────────────────

export interface CreateProjectInput {
  name: string;
  description?: string;
  domain: 'electromechanical' | 'bim' | 'software' | 'other';
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  startDate?: string | null;
  endDate?: string | null;
  coverImageUrl?: string | null;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  domain?: 'electromechanical' | 'bim' | 'software' | 'other';
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  startDate?: string | null;
  endDate?: string | null;
  coverImageUrl?: string | null;
}

export type ProjectWithCounts = Project & { memberCount: number; taskCount: number };
export type ProjectWithMembers = Project & { members: ProjectMember[] };

// ── API functions ──────────────────────────────────────────────────────────────

export const projectsApi = {
  list: () => get<{ projects: ProjectWithCounts[] }>('/projects'),

  create: (data: CreateProjectInput) => post<{ project: Project }>('/projects', data),

  get: (id: number) => get<{ project: ProjectWithMembers }>(`/projects/${id}`),

  update: (id: number, data: UpdateProjectInput) =>
    patch<{ project: Project }>(`/projects/${id}`, data),

  delete: (id: number) => del<void>(`/projects/${id}`),

  addMember: (projectId: number, userId: number, role: 'manager' | 'member') =>
    post<{ member: ProjectMember }>(`/projects/${projectId}/members`, { userId, role }),

  removeMember: (projectId: number, userId: number) =>
    del<void>(`/projects/${projectId}/members/${userId}`),

  listMembers: (projectId: number) =>
    get<{ members: ProjectMember[] }>(`/projects/${projectId}/members`),
};
