// ============================================================
// @bim/shared-types — Canonical TypeScript interfaces
// Mirrors: BIMdb_Schema (cbimtech_TimeSheetWeb) +
//          dmcDb_Schema  (cbimtech_dmc)
// Based on: BIMWebApps + DMCTimesheet legacy source analysis
// ============================================================

// ----------------------------------------------------------
// COMMON
// ----------------------------------------------------------
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// ----------------------------------------------------------
// DISCIPLINES (C14_Descipline / C18_Descipline)
// ----------------------------------------------------------
export type DisciplineCode = 'ARC' | 'STR' | 'MEP' | 'CIVIL' | 'LANDSCAPE' | 'INTERIOR' | 'MGMT' | 'IT' | 'ADMIN' | 'OTHER';

export interface Discipline {
  disciplineId: number;
  disciplineCode: string;
  disciplineName: string;
  isActive: boolean;
}

// ----------------------------------------------------------
// POSITIONS (C17_Position)
// ----------------------------------------------------------
export interface Position {
  positionId: number;
  positionCode: string;
  positionName: string;
  hierarchyLevel: number;
  isActive: boolean;
}

// ----------------------------------------------------------
// ROLES
// ----------------------------------------------------------
export type RoleCode = 'EMPLOYEE' | 'TEAM_LEAD' | 'PM' | 'ADMIN' | 'SUPER_ADMIN';

export interface Role {
  roleId: number;
  roleCode: RoleCode;
  roleName: string;
  hierarchyLevel: number;
}

// ----------------------------------------------------------
// DEPARTMENTS
// ----------------------------------------------------------
export interface Department {
  departmentId: number;
  deptCode: string;
  deptName: string;
  parentDeptId: number | null;
  isActive: boolean;
}

// ----------------------------------------------------------
// EMPLOYEES (C02_BIMstaff + C02_Members unified)
// ----------------------------------------------------------
export interface Employee {
  employeeId: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  shortName: string | null;
  email: string;
  phone: string | null;
  departmentId: number | null;
  disciplineId: number | null;
  positionId: number | null;
  managerId: number | null;
  joinDate: string | null;
  leaveDate: string | null;
  overtimeThresholdDaily: number;
  isActive: boolean;
  avatarUrl: string | null;
  legacyBIMstaffId: number | null;
  legacyDMCUserId: number | null;
  // Joined
  department?: { departmentId: number; deptCode: string; deptName: string };
  discipline?: { disciplineId: number; disciplineCode: string; disciplineName: string };
  position?: { positionId: number; positionCode: string; positionName: string };
}

// ----------------------------------------------------------
// WORK GROUPS (C19_Workgroup)
// ----------------------------------------------------------
export interface WorkGroup {
  workGroupId: number;
  groupCode: string;
  groupName: string;
  isProjectRelated: boolean;   // true = requires ProjectID in task log
  isActive: boolean;
  sortOrder: number;
  workTypes?: WorkType[];
}

// ----------------------------------------------------------
// WORK TYPES (C07_WorkType)
// ----------------------------------------------------------
export interface WorkType {
  workTypeId: number;
  workGroupId: number;
  typeCode: string;
  typeName: string;
  isActive: boolean;
  sortOrder: number;
  detailActions?: WorkDetailAction[];
}

// ----------------------------------------------------------
// DETAIL ACTIONS (C21_DetailAction)
// ----------------------------------------------------------
export interface WorkDetailAction {
  detailActionId: number;
  workTypeId: number;
  actionCode: string;
  actionName: string;
  defaultHours: number | null;
  isActive: boolean;
  sortOrder: number;
}

// ----------------------------------------------------------
// LEAVE
// ----------------------------------------------------------
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveType {
  leaveTypeId: number;
  typeCode: string;
  typeName: string;
  maxDaysPerYear: number | null;
  isPaid: boolean;
  requiresApproval: boolean;
  isActive: boolean;
}

export interface LeaveBalance {
  balanceId: number;
  employeeId: number;
  leaveTypeId: number;
  year: number;
  allowedDays: number;
  usedDays: number;
  pendingDays: number;
  carryOverDays: number;
  remainingDays: number;
  leaveType?: { leaveTypeId: number; typeCode: string; typeName: string; isPaid: boolean };
}

export interface LeaveRequest {
  requestId: number;
  employeeId: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string | null;
  status: LeaveStatus;
  approvedById: number | null;
  approvedAt: string | null;
  rejectionNote: string | null;
  createdAt: string;
  leaveType?: { leaveTypeId: number; typeCode: string; typeName: string; isPaid: boolean };
  employee?: { employeeId: number; firstName: string; lastName: string; employeeCode: string };
}

// ----------------------------------------------------------
// TIMESHEET (TimesheetEntry + TaskLog)
// Workflow: per-day entry (attendance) + per-task logs
// Based on: C08_Timesheet (DMCTimesheet) / C15_TimeSheet (BIMWebApps)
// ----------------------------------------------------------
export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'LOCKED';

export interface TimesheetEntry {
  entryId: number;
  employeeId: number;
  workDate: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  breakMinutes: number;
  netHoursWorked: number | null;   // computed from clock diff
  totalHours: number | null;       // sum from task logs (auto via trigger)
  overtimeHours: number | null;    // sum OT from task logs
  status: TimesheetStatus;
  submittedAt: string | null;
  approvedById: number | null;
  approvedAt: string | null;
  rejectionNote: string | null;
  notes: string | null;
  locationLat: number | null;
  locationLng: number | null;
  clockInSource: 'WEB' | 'MOBILE' | 'KIOSK' | 'MANUAL';
  createdAt: string;
  updatedAt: string;
  // Joined
  employee?: { employeeId: number; firstName: string; lastName: string; employeeCode: string };
  taskLogs?: TaskLog[];
}

// TaskLog = C08_Timesheet / C15_TimeSheet record
// Each represents one task/activity within a work day
export interface TaskLog {
  logId: number;
  entryId: number | null;
  employeeId: number;
  workDate: string;
  projectId: number | null;       // NULL for non-project tasks (meetings, admin)
  projectName: string | null;
  maDuAn: string | null;
  workGroupId: number;
  workGroupName: string | null;
  workTypeId: number;
  workTypeName: string | null;
  detailActionId: number | null;
  detailActionName: string | null;
  hours: number;                  // regular hours
  overtimeHours: number;          // OT hours
  description: string | null;
  isConfirmed: boolean;           // C08_Timesheet.isConfirm
  createdAt: string;
  updatedAt: string | null;
}

export interface TaskLogInput {
  workDate?: string;
  projectId?: number;
  workGroupId: number;
  workTypeId: number;
  detailActionId?: number;
  hours: number;
  overtimeHours?: number;
  description?: string;
  isConfirmed?: boolean;
}

export interface ClockInInput {
  locationLat?: number;
  locationLng?: number;
  source?: 'WEB' | 'MOBILE' | 'KIOSK' | 'MANUAL';
  notes?: string;
}

export interface ClockOutInput {
  breakMinutes?: number;
  notes?: string;
}

export interface WeekSummary {
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  overtimeHours: number;
  entries: TimesheetEntry[];
  submittedCount: number;
  approvedCount: number;
  pendingCount: number;
  workGroupBreakdown?: Array<{
    groupCode: string;
    groupName: string;
    hours: number;
    percentage: number;
  }>;
}

// ----------------------------------------------------------
// PROJECTS (C01_Projects + C01_DesignProject combined)
// ----------------------------------------------------------
export interface ProjectStatus {
  statusId: number;
  statusCode: string;
  statusName: string;
  colorCode: string;
  sortOrder: number;
}

export interface ProjectType {
  typeId: number;
  typeCode: string;
  typeName: string;
  description: string | null;
}

export interface ProjectStage {
  stageId: number;
  stageName: string;
  stageCode: string | null;
  sortOrder: number;
}

export interface Client {
  clientId: number;
  clientCode: string;
  clientName: string;
  shortName: string | null;
  industry: string | null;
  isActive: boolean;
}

export interface ProjectPhase {
  phaseId: number;
  projectId: number;
  phaseName: string;
  phaseCode: string | null;
  phaseOrder: number;
  budgetHours: number;
  startDate: string | null;
  endDate: string | null;
  status: string;
  description: string | null;
}

export interface Project {
  projectId: number;
  maDuAn: string;              // DMC project code (primary)
  projectCode: string | null;  // BIM project code
  projectName: string;
  projectOtherName: string | null;
  clientId: number | null;
  typeId: number | null;
  statusId: number;
  stageId: number | null;
  locationId: number | null;
  startDate: string | null;
  plannedEndDate: string | null;
  actualEndDate: string | null;
  year: number | null;
  budgetHours: number;
  budgetAmount: number | null;
  currencyCode: string;
  dienTich: number | null;
  // Key people (EmployeeIDs)
  pmEmployeeId: number | null;
  chuTriChinh: number | null;
  chuTriKienTruc: number | null;
  chuTriKetCau: number | null;
  chuTriMEP: number | null;
  bimManager: number | null;
  bimSoftware: string | null;
  isInternal: boolean;
  isActive: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  // Flat-joined fields (from query joins)
  clientName: string | null;
  clientShortName: string | null;
  statusName: string | null;
  statusColor: string | null;
  typeName: string | null;
  stageName: string | null;
  locationName: string | null;
  // Nested
  phases?: ProjectPhase[];
  // Analytics
  actualHours?: number;
  burnRate?: number;
}

export interface ProjectAssignment {
  assignmentId: number;
  projectId: number;
  employeeId: number;
  phaseId: number | null;
  projectRole: string;
  disciplineCode: string | null;
  allocatedHours: number;
  allocationPct: number | null;
  dateAssign: string | null;
  endDate: string | null;
  isActive: boolean;
  notes: string | null;
}

export interface ProjectMember {
  assignmentId: number;
  projectId: number;
  employee: Pick<Employee, 'employeeId' | 'firstName' | 'lastName' | 'shortName' | 'email'>;
  projectRole: string;
  disciplineCode: string | null;
  allocatedHours: number;
  actualHours?: number;
}

// ----------------------------------------------------------
// ANALYTICS
// ----------------------------------------------------------
export interface OvertimeData {
  employeeId: number;
  employeeName: string;
  department: string;
  disciplineCode: string;
  weeklyData: Array<{
    weekStart: string;
    totalHours: number;
    overtimeHours: number;
    daysWorked: number;
  }>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  consecutiveOvertimeWeeks: number;
}

export interface BudgetBurnData {
  projectId: number;
  maDuAn: string;
  projectCode: string | null;
  projectName: string;
  budgetHours: number;
  actualHours: number;
  burnRate: number;          // 0–1+
  weeklyHours: number;
  projectedTotal: number | null;
  projectedOverrun: number | null;
  riskLevel: 'ON_TRACK' | 'AT_RISK' | 'OVER_BUDGET';
  statusColor: string;
}

export interface AttendanceData {
  date: string;
  departmentId: number;
  departmentName: string;
  expectedHeadcount: number;
  actualPresentCount: number;
  attendanceRate: number;
  lateArrivals: number;
  earlyDepartures: number;
}

export interface ProductivityData {
  employeeId: number;
  period: string;
  totalHours: number;
  workGroupBreakdown: Array<{
    groupCode: string;
    groupName: string;
    hours: number;
    percentage: number;
  }>;
  topProjects: Array<{ projectId: number; maDuAn: string; projectName: string; hours: number }>;
}

export interface DashboardSummary {
  myHoursThisWeek: number;
  myOvertimeThisWeek: number;
  pendingApprovals: number;
  // Admin fields (hierarchyLevel >= 3)
  totalActiveEmployees?: number;
  companyHoursThisWeek?: number;
  overtimeRiskCount?: number;
  pendingLeaveRequests?: number;
  weeklyHoursTrend?: Array<{ week: string; hours: number }>;
}

// ----------------------------------------------------------
// AI INSIGHTS
// ----------------------------------------------------------
export type InsightType =
  | 'OVERTIME_RISK'
  | 'BUDGET_BURN'
  | 'ATTENDANCE_PATTERN'
  | 'PRODUCTIVITY_TIP'
  | 'TEAM_BALANCE'
  | 'WEEKLY_DIGEST';

export type InsightSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AIInsight {
  insightId: number;
  insightType: InsightType;
  severity: InsightSeverity;
  title: string;
  summary: string;
  recommendations: string[];
  targetEmployeeId: number | null;
  targetProjectId: number | null;
  isRead: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Alias used in AI service
export type AIChatMessage = ChatMessage;

export interface AIInsightGenerateRequest {
  type: InsightType;
  targetEmployeeId?: number;
  targetProjectId?: number;
  targetType?: 'EMPLOYEE' | 'TEAM' | 'COMPANY' | 'PROJECT';
}

// ----------------------------------------------------------
// AUTH
// ----------------------------------------------------------
export interface AuthUser {
  employeeId: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  roleCode: RoleCode;
  hierarchyLevel: number;
  departmentId: number;
  disciplineCode: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

// ----------------------------------------------------------
// NOTIFICATIONS
// ----------------------------------------------------------
export type NotificationType =
  | 'TIMESHEET_REMINDER'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED'
  | 'OVERTIME_ALERT'
  | 'BUDGET_ALERT'
  | 'APPROVAL_REQUEST'
  | 'AI_INSIGHT';

export interface Notification {
  notificationId: number;
  employeeId: number;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string;
}
