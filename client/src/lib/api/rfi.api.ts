import { get, post, patch, del } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────

export type RfiDiscipline =
  | 'Mechanical'
  | 'Electrical'
  | 'Plumbing'
  | 'Fire Protection'
  | 'Civil / Structural'
  | 'Architectural'
  | 'General';

export type RfiPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type RfiStatus = 'Open' | 'Under Review' | 'Responded' | 'Closed';

export interface Rfi {
  id: number;
  projectId: number;
  rfiNumber: string;
  title: string;
  discipline: RfiDiscipline;
  priority: RfiPriority;
  status: RfiStatus;
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

export type RfiRow = Rfi & { commentCount: number };

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

export type RfiDetail = Rfi & { comments: RfiComment[]; activity: RfiActivity[] };

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

export interface CreateRfiInput {
  title: string;
  discipline: RfiDiscipline;
  priority?: RfiPriority;
  submittedBy: string;
  assignedTo?: string | null;
  drawingRef?: string | null;
  specRef?: string | null;
  dateSubmitted?: string;
  requiredDate?: string | null;
  description: string;
}

export interface UpdateRfiInput {
  title?: string;
  discipline?: RfiDiscipline;
  priority?: RfiPriority;
  status?: RfiStatus;
  submittedBy?: string;
  assignedTo?: string | null;
  drawingRef?: string | null;
  specRef?: string | null;
  requiredDate?: string | null;
  responseDate?: string | null;
  description?: string;
  response?: string | null;
}

export interface ListRfisFilters {
  status?: RfiStatus;
  discipline?: RfiDiscipline;
  priority?: RfiPriority;
}

// ── API functions ──────────────────────────────────────────────────────────────

export const rfiApi = {
  list: (projectId: number, filters?: ListRfisFilters) => {
    const params: Record<string, string> = {};
    if (filters?.status)     params['status']     = filters.status;
    if (filters?.discipline) params['discipline'] = filters.discipline;
    if (filters?.priority)   params['priority']   = filters.priority;
    return get<{ rfis: RfiRow[] }>(`/projects/${projectId}/rfis`, params as Record<string, unknown>);
  },

  stats: (projectId: number) =>
    get<{ stats: RfiProjectStats }>(`/projects/${projectId}/rfis/stats`),

  get: (id: number) =>
    get<{ rfi: RfiDetail }>(`/rfis/${id}`),

  create: (projectId: number, data: CreateRfiInput) =>
    post<{ rfi: Rfi }>(`/projects/${projectId}/rfis`, data),

  update: (id: number, data: UpdateRfiInput) =>
    patch<{ rfi: Rfi }>(`/rfis/${id}`, data),

  remove: (id: number) =>
    del<void>(`/rfis/${id}`),

  addComment: (id: number, body: string) =>
    post<{ comment: RfiComment }>(`/rfis/${id}/comments`, { body }),

  deleteComment: (id: number, commentId: number) =>
    del<void>(`/rfis/${id}/comments/${commentId}`),
};
