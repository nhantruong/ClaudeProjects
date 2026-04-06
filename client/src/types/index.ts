// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  role: 'admin' | 'manager' | 'member';
}

// ── API envelope ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

// ── Projects ──────────────────────────────────────────────────────────────────

export type ProjectDomain = 'electromechanical' | 'bim' | 'software' | 'other';
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

export interface Project {
  id: number;
  name: string;
  description: string | null;
  domain: ProjectDomain;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  coverImageUrl: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  userId: number;
  displayName: string;
  username?: string;
  role: 'manager' | 'member';
  joinedAt: string;
  avatarUrl?: string | null;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked';
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  dependsOn?: number[];
  blocks?: number[];
}

export interface Subtask {
  id: number;
  taskId: number;
  title: string;
  isComplete: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface TaskComment {
  id: number;
  taskId: number;
  userId: number;
  userDisplayName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  activeProjects: number;
  dueToday: number;
  overdue: number;
  doneThisWeek: number;
  projects: Project[];
  teamWorkload: TeamWorkloadItem[];
  ppcTrend: PpcTrendItem[];
}

export interface TeamWorkloadItem {
  userId: number;
  displayName: string;
  taskCount: number;
}

export interface PpcTrendItem {
  weekLabel: string;
  weekStartDate: string;
  ppc: number;
}

// ── Lean / Last Planner System ────────────────────────────────────────────────

export interface WeeklyWorkPlan {
  id: number;
  projectId: number;
  weekStartDate: string;
  ppc: number | null;
  createdBy: number;
  createdAt: string;
  tasks: WwpTask[];
}

export interface WwpTask {
  id: number;
  wwpId: number;
  taskId: number | null;
  description: string;
  assigneeId: number | null;
  assigneeName: string | null;
  isComplete: boolean;
  varianceReason: string | null;
  createdAt: string;
}

// ── Advisor ───────────────────────────────────────────────────────────────────

export interface AdvisorBriefing {
  generatedAt: string;
  priorities: AdvisorPriority[];
}

export interface AdvisorPriority {
  rank: number;
  level: 'critical' | 'high' | 'normal';
  summary: string;
  detail: string;
  taskId: number | null;
  projectId: number | null;
}
