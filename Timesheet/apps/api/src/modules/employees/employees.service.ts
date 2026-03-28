import { getBimDb, sql } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import bcrypt from 'bcryptjs';
import type { Employee } from '@bim/shared-types';

// ============================================================
// LIST / SEARCH
// ============================================================
export interface EmployeeFilters {
  departmentId?: number;
  disciplineId?: number;
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listEmployees(filters: EmployeeFilters = {}): Promise<{
  data: Employee[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const pool = getBimDb();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, filters.pageSize ?? 20);
  const offset = (page - 1) * pageSize;

  const req = pool.request()
    .input('DeptID', sql.Int, filters.departmentId ?? null)
    .input('DiscID', sql.Int, filters.disciplineId ?? null)
    .input('Active', sql.Bit, filters.isActive != null ? (filters.isActive ? 1 : 0) : null)
    .input('Search', sql.NVarChar(100), filters.search ? `%${filters.search}%` : null)
    .input('Offset', sql.Int, offset)
    .input('PageSize', sql.Int, pageSize);

  const result = await req.query(`
    SELECT
      e.EmployeeID, e.EmployeeCode, e.FirstName, e.LastName, e.ShortName, e.Email,
      e.Phone, e.DepartmentID, e.DisciplineID, e.PositionID, e.ManagerID,
      e.JoinDate, e.LeaveDate, e.OvertimeThresholdDaily, e.IsActive,
      e.AvatarURL, e.LegacyBIMstaffID, e.LegacyDMCUserID,
      d.DeptName, d.DeptCode,
      disc.DisciplineName, disc.DisciplineCode,
      pos.PositionName, pos.PositionCode,
      COUNT(*) OVER () AS TotalCount
    FROM BIMdb_Schema.Employees e
    LEFT JOIN BIMdb_Schema.Departments d ON d.DepartmentID = e.DepartmentID
    LEFT JOIN BIMdb_Schema.Disciplines disc ON disc.DisciplineID = e.DisciplineID
    LEFT JOIN BIMdb_Schema.Positions pos ON pos.PositionID = e.PositionID
    WHERE (@DeptID IS NULL OR e.DepartmentID = @DeptID)
      AND (@DiscID IS NULL OR e.DisciplineID = @DiscID)
      AND (@Active IS NULL OR e.IsActive = @Active)
      AND (@Search IS NULL OR e.FirstName LIKE @Search OR e.LastName LIKE @Search
           OR e.EmployeeCode LIKE @Search OR e.Email LIKE @Search)
    ORDER BY e.LastName, e.FirstName
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY
  `);

  const total = result.recordset[0]?.TotalCount ?? 0;
  return {
    data: result.recordset.map(mapEmployee),
    total,
    page,
    pageSize,
  };
}

// ============================================================
// GET BY ID
// ============================================================
export async function getEmployeeById(id: number): Promise<Employee> {
  const pool = getBimDb();
  const result = await pool.request()
    .input('ID', sql.Int, id)
    .query(`
      SELECT
        e.*, d.DeptName, d.DeptCode,
        disc.DisciplineName, disc.DisciplineCode,
        pos.PositionName, pos.PositionCode
      FROM BIMdb_Schema.Employees e
      LEFT JOIN BIMdb_Schema.Departments d ON d.DepartmentID = e.DepartmentID
      LEFT JOIN BIMdb_Schema.Disciplines disc ON disc.DisciplineID = e.DisciplineID
      LEFT JOIN BIMdb_Schema.Positions pos ON pos.PositionID = e.PositionID
      WHERE e.EmployeeID = @ID
    `);

  if (!result.recordset[0]) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy nhân viên');
  return mapEmployee(result.recordset[0]);
}

// ============================================================
// CREATE
// ============================================================
export interface CreateEmployeeInput {
  employeeCode: string;
  firstName: string;
  lastName: string;
  shortName?: string;
  email: string;
  phone?: string;
  departmentId?: number;
  disciplineId?: number;
  positionId?: number;
  managerId?: number;
  joinDate?: string;
  overtimeThresholdDaily?: number;
  password: string;
}

export async function createEmployeeV2(input: CreateEmployeeInput): Promise<Employee> {
  const pool = getBimDb();

  const existing = await pool.request()
    .input('Email', sql.NVarChar(150), input.email)
    .query(`SELECT EmployeeID FROM BIMdb_Schema.Employees WHERE Email = @Email`);
  if (existing.recordset.length) throw new AppError(409, 'EMAIL_EXISTS', 'Email đã tồn tại');

  const passwordHash = await bcrypt.hash(input.password, 12);

  // Insert employee
  const empResult = await pool.request()
    .input('Code', sql.NVarChar(20), input.employeeCode)
    .input('First', sql.NVarChar(80), input.firstName)
    .input('Last', sql.NVarChar(80), input.lastName)
    .input('Short', sql.NVarChar(30), input.shortName ?? null)
    .input('Email', sql.NVarChar(150), input.email)
    .input('Phone', sql.NVarChar(20), input.phone ?? null)
    .input('DeptID', sql.Int, input.departmentId ?? null)
    .input('DiscID', sql.Int, input.disciplineId ?? null)
    .input('PosID', sql.Int, input.positionId ?? null)
    .input('MgrID', sql.Int, input.managerId ?? null)
    .input('JoinDate', sql.Date, input.joinDate ?? null)
    .input('OTThreshold', sql.Decimal(4, 2), input.overtimeThresholdDaily ?? 9)
    .query(`
      INSERT INTO BIMdb_Schema.Employees
        (EmployeeCode, FirstName, LastName, ShortName, Email, Phone,
         DepartmentID, DisciplineID, PositionID, ManagerID, JoinDate, OvertimeThresholdDaily)
      OUTPUT INSERTED.EmployeeID
      VALUES
        (@Code, @First, @Last, @Short, @Email, @Phone,
         @DeptID, @DiscID, @PosID, @MgrID, @JoinDate, @OTThreshold)
    `);

  const newId = empResult.recordset[0]['EmployeeID'] as number;

  // Insert auth record
  await pool.request()
    .input('EmpID', sql.Int, newId)
    .input('Hash', sql.NVarChar(255), passwordHash)
    .query(`INSERT INTO BIMdb_Schema.EmployeeAuth (EmployeeID, PasswordHash) VALUES (@EmpID, @Hash)`);

  return getEmployeeById(newId);
}

// ============================================================
// UPDATE
// ============================================================
export interface UpdateEmployeeInput {
  firstName?: string;
  lastName?: string;
  shortName?: string;
  phone?: string;
  departmentId?: number;
  disciplineId?: number;
  positionId?: number;
  managerId?: number;
  joinDate?: string;
  leaveDate?: string;
  overtimeThresholdDaily?: number;
  isActive?: boolean;
  avatarUrl?: string;
}

export async function updateEmployee(id: number, input: UpdateEmployeeInput): Promise<Employee> {
  const pool = getBimDb();

  await pool.request()
    .input('ID', sql.Int, id)
    .input('First', sql.NVarChar(80), input.firstName ?? null)
    .input('Last', sql.NVarChar(80), input.lastName ?? null)
    .input('Short', sql.NVarChar(30), input.shortName ?? null)
    .input('Phone', sql.NVarChar(20), input.phone ?? null)
    .input('DeptID', sql.Int, input.departmentId ?? null)
    .input('DiscID', sql.Int, input.disciplineId ?? null)
    .input('PosID', sql.Int, input.positionId ?? null)
    .input('MgrID', sql.Int, input.managerId ?? null)
    .input('JoinDate', sql.Date, input.joinDate ?? null)
    .input('LeaveDate', sql.Date, input.leaveDate ?? null)
    .input('OTThreshold', sql.Decimal(4, 2), input.overtimeThresholdDaily ?? null)
    .input('Active', sql.Bit, input.isActive != null ? (input.isActive ? 1 : 0) : null)
    .input('Avatar', sql.NVarChar(500), input.avatarUrl ?? null)
    .query(`
      UPDATE BIMdb_Schema.Employees SET
        FirstName             = COALESCE(@First, FirstName),
        LastName              = COALESCE(@Last, LastName),
        ShortName             = COALESCE(@Short, ShortName),
        Phone                 = COALESCE(@Phone, Phone),
        DepartmentID          = COALESCE(@DeptID, DepartmentID),
        DisciplineID          = COALESCE(@DiscID, DisciplineID),
        PositionID            = COALESCE(@PosID, PositionID),
        ManagerID             = COALESCE(@MgrID, ManagerID),
        JoinDate              = COALESCE(@JoinDate, JoinDate),
        LeaveDate             = COALESCE(@LeaveDate, LeaveDate),
        OvertimeThresholdDaily= COALESCE(@OTThreshold, OvertimeThresholdDaily),
        IsActive              = COALESCE(@Active, IsActive),
        AvatarURL             = COALESCE(@Avatar, AvatarURL),
        UpdatedAt             = GETUTCDATE()
      WHERE EmployeeID = @ID
    `);

  return getEmployeeById(id);
}

// ============================================================
// CHANGE PASSWORD (self or admin)
// ============================================================
export async function changePassword(
  employeeId: number,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const pool = getBimDb();
  const result = await pool.request()
    .input('EmpID', sql.Int, employeeId)
    .query(`SELECT PasswordHash FROM BIMdb_Schema.EmployeeAuth WHERE EmployeeID = @EmpID`);

  const row = result.recordset[0];
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản');

  const valid = await bcrypt.compare(currentPassword, row['PasswordHash'] as string);
  if (!valid) throw new AppError(401, 'WRONG_PASSWORD', 'Mật khẩu hiện tại không đúng');

  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.request()
    .input('EmpID', sql.Int, employeeId)
    .input('Hash', sql.NVarChar(255), newHash)
    .query(`
      UPDATE BIMdb_Schema.EmployeeAuth
      SET PasswordHash = @Hash, FailedAttempts = 0, LockedUntil = NULL, UpdatedAt = GETUTCDATE()
      WHERE EmployeeID = @EmpID
    `);
}

export async function adminResetPassword(employeeId: number, newPassword: string): Promise<void> {
  const pool = getBimDb();
  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.request()
    .input('EmpID', sql.Int, employeeId)
    .input('Hash', sql.NVarChar(255), newHash)
    .query(`
      UPDATE BIMdb_Schema.EmployeeAuth
      SET PasswordHash = @Hash, FailedAttempts = 0, LockedUntil = NULL, UpdatedAt = GETUTCDATE()
      WHERE EmployeeID = @EmpID
    `);
}

// ============================================================
// DEPARTMENTS & LOOKUP DATA
// ============================================================
export async function getDepartments() {
  const pool = getBimDb();
  const result = await pool.request().query(`
    SELECT DepartmentID, DeptCode, DeptName, ParentDeptID, IsActive
    FROM BIMdb_Schema.Departments
    WHERE IsActive = 1
    ORDER BY DeptName
  `);
  return result.recordset.map(r => ({
    departmentId: r['DepartmentID'] as number,
    deptCode: r['DeptCode'] as string,
    deptName: r['DeptName'] as string,
    parentDeptId: r['ParentDeptID'] as number | null,
    isActive: Boolean(r['IsActive']),
  }));
}

export async function getDisciplines() {
  const pool = getBimDb();
  const result = await pool.request().query(`
    SELECT DisciplineID, DisciplineCode, DisciplineName, IsActive
    FROM BIMdb_Schema.Disciplines
    WHERE IsActive = 1
    ORDER BY DisciplineName
  `);
  return result.recordset.map(r => ({
    disciplineId: r['DisciplineID'] as number,
    disciplineCode: r['DisciplineCode'] as string,
    disciplineName: r['DisciplineName'] as string,
    isActive: Boolean(r['IsActive']),
  }));
}

export async function getPositions() {
  const pool = getBimDb();
  const result = await pool.request().query(`
    SELECT PositionID, PositionCode, PositionName, HierarchyLevel, IsActive
    FROM BIMdb_Schema.Positions
    WHERE IsActive = 1
    ORDER BY HierarchyLevel, PositionName
  `);
  return result.recordset.map(r => ({
    positionId: r['PositionID'] as number,
    positionCode: r['PositionCode'] as string,
    positionName: r['PositionName'] as string,
    hierarchyLevel: r['HierarchyLevel'] as number,
    isActive: Boolean(r['IsActive']),
  }));
}

// ============================================================
// MAPPER
// ============================================================
function mapEmployee(row: Record<string, unknown>): Employee {
  return {
    employeeId: row['EmployeeID'] as number,
    employeeCode: row['EmployeeCode'] as string,
    firstName: row['FirstName'] as string,
    lastName: row['LastName'] as string,
    shortName: row['ShortName'] as string | null,
    email: row['Email'] as string,
    phone: row['Phone'] as string | null,
    departmentId: row['DepartmentID'] as number | null,
    disciplineId: row['DisciplineID'] as number | null,
    positionId: row['PositionID'] as number | null,
    managerId: row['ManagerID'] as number | null,
    joinDate: row['JoinDate'] ? (row['JoinDate'] as Date).toISOString().slice(0, 10) : null,
    leaveDate: row['LeaveDate'] ? (row['LeaveDate'] as Date).toISOString().slice(0, 10) : null,
    overtimeThresholdDaily: Number(row['OvertimeThresholdDaily'] ?? 9),
    isActive: Boolean(row['IsActive']),
    avatarUrl: row['AvatarURL'] as string | null,
    legacyBIMstaffId: row['LegacyBIMstaffID'] as number | null,
    legacyDMCUserId: row['LegacyDMCUserID'] as number | null,
    department: row['DeptName']
      ? { departmentId: row['DepartmentID'] as number, deptCode: row['DeptCode'] as string, deptName: row['DeptName'] as string }
      : undefined,
    discipline: row['DisciplineName']
      ? { disciplineId: row['DisciplineID'] as number, disciplineCode: row['DisciplineCode'] as string, disciplineName: row['DisciplineName'] as string }
      : undefined,
    position: row['PositionName']
      ? { positionId: row['PositionID'] as number, positionCode: row['PositionCode'] as string, positionName: row['PositionName'] as string }
      : undefined,
  };
}
