import { get, post, patch } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  username: string;
  displayName: string;
  role: 'admin' | 'manager' | 'member';
  isActive: boolean;
}

export interface CreateUserInput {
  username: string;
  displayName: string;
  password: string;
  role: 'admin' | 'manager' | 'member';
}

export interface UpdateUserInput {
  displayName?: string;
  role?: 'admin' | 'manager' | 'member';
  isActive?: boolean;
}

// ── API functions ──────────────────────────────────────────────────────────────

export interface MemberProject {
  id: number;
  name: string;
  domain: string;
  status: string;
  role: string;
  taskCount: number;
}

export const usersApi = {
  /** List all user accounts. Admin only. */
  list: () => get<{ users: User[] }>('/users'),

  /** Create a new user account. Admin only. */
  create: (data: CreateUserInput) => post<{ user: User }>('/users', data),

  /** Partially update a user account. Admin only. */
  update: (id: number, data: UpdateUserInput) =>
    patch<{ user: User }>(`/users/${id}`, data),

  /** Get projects for a user. Admin only. */
  getMemberProjects: (userId: number) =>
    get<{ projects: MemberProject[] }>(`/users/${userId}/projects`),
};
