import { getBimDb, sql } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import type {
  TimesheetEntry, ClockInInput, ClockOutInput, WeekSummary,
  TaskLog, TaskLogInput,
} from '@bim/shared-types';

// ============================================================
// CLOCK IN
// ============================================================
export async function clockIn(employeeId: number, input: ClockInInput): Promise<TimesheetEntry> {
  const pool = getBimDb();
  const today = new Date().toISOString().slice(0, 10);

  // Check if already clocked in today
  const existing = await pool
    .request()
    .input('EmpID', sql.Int, employeeId)
    .input('Date', sql.Date, today)
    .query(`SELECT EntryID, ClockInTime, ClockOutTime, Status FROM BIMdb_Schema.TimesheetEntries
            WHERE EmployeeID = @EmpID AND WorkDate = @Date`);

  if (existing.recordset.length > 0) {
    const entry = existing.recordset[0];
    if (entry.ClockInTime) throw new AppError(409, 'ALREADY_CLOCKED_IN', 'Bạn đã chấm công hôm nay rồi');
  }

  const result = await pool
    .request()
    .input('EmpID', sql.Int, employeeId)
    .input('Date', sql.Date, today)
    .input('ClockIn', sql.DateTime2, new Date())
    .input('Lat', sql.Decimal(10, 8), input.locationLat ?? null)
    .input('Lng', sql.Decimal(11, 8), input.locationLng ?? null)
    .input('Source', sql.NVarChar(20), input.source ?? 'WEB')
    .input('Notes', sql.NVarChar(1000), input.notes ?? null)
    .query(`
      MERGE BIMdb_Schema.TimesheetEntries AS target
      USING (SELECT @EmpID AS EmployeeID, @Date AS WorkDate) AS source
      ON target.EmployeeID = source.EmployeeID AND target.WorkDate = source.WorkDate
      WHEN NOT MATCHED THEN
        INSERT (EmployeeID, WorkDate, ClockInTime, LocationLat, LocationLng, ClockInSource, Notes, Status)
        VALUES (@EmpID, @Date, @ClockIn, @Lat, @Lng, @Source, @Notes, 'DRAFT')
      WHEN MATCHED AND target.ClockInTime IS NULL THEN
        UPDATE SET ClockInTime = @ClockIn, LocationLat = @Lat, LocationLng = @Lng,
                   ClockInSource = @Source, Notes = @Notes, UpdatedAt = GETUTCDATE();

      SELECT TOP 1 * FROM BIMdb_Schema.TimesheetEntries
      WHERE EmployeeID = @EmpID AND WorkDate = @Date;
    `);

  return mapEntry(result.recordset[0]);
}

// ============================================================
// CLOCK OUT
// ============================================================
export async function clockOut(employeeId: number, input: ClockOutInput): Promise<TimesheetEntry> {
  const pool = getBimDb();
  const today = new Date().toISOString().slice(0, 10);

  const existing = await pool
    .request()
    .input('EmpID', sql.Int, employeeId)
    .input('Date', sql.Date, today)
    .query(`SELECT EntryID, ClockInTime, ClockOutTime, Status
            FROM BIMdb_Schema.TimesheetEntries WHERE EmployeeID = @EmpID AND WorkDate = @Date`);

  const row = existing.recordset[0];
  if (!row) throw new AppError(404, 'NO_ENTRY', 'Chưa có dữ liệu chấm công hôm nay. Hãy chấm công vào trước');
  if (!row.ClockInTime) throw new AppError(409, 'NOT_CLOCKED_IN', 'Chưa chấm công vào');
  if (row.ClockOutTime) throw new AppError(409, 'ALREADY_CLOCKED_OUT', 'Đã chấm công ra rồi');
  if (row.Status === 'LOCKED') throw new AppError(409, 'LOCKED', 'Bản ghi đã bị khóa');

  const breakMins = input.breakMinutes ?? 60;  // default lunch break

  // Calculate overtime
  const clockIn = new Date(row.ClockInTime);
  const clockOut = new Date();
  const netHours = (clockOut.getTime() - clockIn.getTime()) / 3_600_000 - breakMins / 60;

  const empResult = await pool.request().input('EmpID', sql.Int, employeeId)
    .query(`SELECT OvertimeThresholdDaily FROM BIMdb_Schema.Employees WHERE EmployeeID = @EmpID`);
  const threshold = empResult.recordset[0]?.OvertimeThresholdDaily ?? 9;
  const overtimeHours = Math.max(0, netHours - threshold);

  await pool
    .request()
    .input('EmpID', sql.Int, employeeId)
    .input('Date', sql.Date, today)
    .input('ClockOut', sql.DateTime2, clockOut)
    .input('Break', sql.Int, breakMins)
    .input('OT', sql.Decimal(5, 2), overtimeHours)
    .input('Notes', sql.NVarChar(1000), input.notes ?? null)
    .query(`
      UPDATE BIMdb_Schema.TimesheetEntries
      SET ClockOutTime = @ClockOut, BreakMinutes = @Break, OvertimeHours = @OT,
          Notes = COALESCE(@Notes, Notes), UpdatedAt = GETUTCDATE()
      WHERE EmployeeID = @EmpID AND WorkDate = @Date
    `);

  return getEntryByDate(employeeId, today);
}

// ============================================================
// GET ENTRY BY DATE
// ============================================================
export async function getEntryByDate(employeeId: number, date: string): Promise<TimesheetEntry> {
  const pool = getBimDb();
  const result = await pool
    .request()
    .input('EmpID', sql.Int, employeeId)
    .input('Date', sql.Date, date)
    .query(`
      SELECT t.*, e.FirstName, e.LastName, e.EmployeeCode
      FROM BIMdb_Schema.TimesheetEntries t
      JOIN BIMdb_Schema.Employees e ON t.EmployeeID = e.EmployeeID
      WHERE t.EmployeeID = @EmpID AND t.WorkDate = @Date
    `);

  if (!result.recordset[0]) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy bản ghi');
  return mapEntry(result.recordset[0]);
}

// ============================================================
// GET WEEK SUMMARY
// ============================================================
export async function getWeekSummary(employeeId: number, weekStart: string): Promise<WeekSummary> {
  const pool = getBimDb();
  // weekStart is Monday — calculate Friday
  const monday = new Date(weekStart);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 6);

  const result = await pool
    .request()
    .input('EmpID', sql.Int, employeeId)
    .input('Start', sql.Date, weekStart)
    .input('End', sql.Date, friday.toISOString().slice(0, 10))
    .query(`
      SELECT t.*, e.FirstName, e.LastName, e.EmployeeCode
      FROM BIMdb_Schema.TimesheetEntries t
      JOIN BIMdb_Schema.Employees e ON t.EmployeeID = e.EmployeeID
      WHERE t.EmployeeID = @EmpID AND t.WorkDate BETWEEN @Start AND @End
      ORDER BY t.WorkDate
    `);

  const entries = result.recordset.map(mapEntry);
  const totalHours = entries.reduce((sum, e) => sum + (e.netHoursWorked ?? 0), 0);
  const overtimeHours = entries.reduce((sum, e) => sum + (e.overtimeHours ?? 0), 0);

  return {
    weekStart,
    weekEnd: friday.toISOString().slice(0, 10),
    totalHours: Math.round(totalHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    entries,
    submittedCount: entries.filter(e => e.status === 'SUBMITTED').length,
    approvedCount: entries.filter(e => e.status === 'APPROVED').length,
    pendingCount: entries.filter(e => e.status === 'DRAFT').length,
  };
}

// ============================================================
// SUBMIT TIMESHEET (week)
// ============================================================
export async function submitWeek(employeeId: number, weekStart: string): Promise<{ updated: number }> {
  const pool = getBimDb();
  const monday = new Date(weekStart);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 6);

  const result = await pool
    .request()
    .input('EmpID', sql.Int, employeeId)
    .input('Start', sql.Date, weekStart)
    .input('End', sql.Date, friday.toISOString().slice(0, 10))
    .query(`
      UPDATE BIMdb_Schema.TimesheetEntries
      SET Status = 'SUBMITTED', SubmittedAt = GETUTCDATE(), UpdatedAt = GETUTCDATE()
      WHERE EmployeeID = @EmpID AND WorkDate BETWEEN @Start AND @End
        AND Status = 'DRAFT' AND ClockInTime IS NOT NULL;
      SELECT @@ROWCOUNT AS Updated;
    `);

  return { updated: result.recordset[0]?.Updated ?? 0 };
}

// ============================================================
// APPROVE / REJECT
// ============================================================
export async function approveEntry(managerId: number, entryId: number): Promise<void> {
  const pool = getBimDb();
  await pool
    .request()
    .input('EntryID', sql.BigInt, entryId)
    .input('MgrID', sql.Int, managerId)
    .query(`
      UPDATE BIMdb_Schema.TimesheetEntries
      SET Status = 'APPROVED', ApprovedByID = @MgrID, ApprovedAt = GETUTCDATE(), UpdatedAt = GETUTCDATE()
      WHERE EntryID = @EntryID AND Status = 'SUBMITTED'
    `);
}

export async function rejectEntry(managerId: number, entryId: number, note: string): Promise<void> {
  const pool = getBimDb();
  await pool
    .request()
    .input('EntryID', sql.BigInt, entryId)
    .input('MgrID', sql.Int, managerId)
    .input('Note', sql.NVarChar(500), note)
    .query(`
      UPDATE BIMdb_Schema.TimesheetEntries
      SET Status = 'REJECTED', ApprovedByID = @MgrID, ApprovedAt = GETUTCDATE(),
          RejectionNote = @Note, UpdatedAt = GETUTCDATE()
      WHERE EntryID = @EntryID AND Status = 'SUBMITTED'
    `);
}

// ============================================================
// TEAM APPROVAL QUEUE (manager/admin)
// ============================================================
export async function getPendingApprovals(
  managerId: number,
  hierarchyLevel: number,
  departmentId: number
): Promise<TimesheetEntry[]> {
  const pool = getBimDb();

  // Admins see all; team leads see their department only
  const deptFilter = hierarchyLevel >= 4 ? '' : 'AND e.DepartmentID = @DeptID';

  const result = await pool
    .request()
    .input('DeptID', sql.Int, departmentId)
    .query(`
      SELECT t.*, e.FirstName, e.LastName, e.EmployeeCode, e.DepartmentID
      FROM BIMdb_Schema.TimesheetEntries t
      JOIN BIMdb_Schema.Employees e ON t.EmployeeID = e.EmployeeID
      WHERE t.Status = 'SUBMITTED' ${deptFilter}
      ORDER BY t.WorkDate DESC, e.LastName
    `);

  return result.recordset.map(mapEntry);
}

// ============================================================
// TASK LOGS (individual task entries per day)
// Mirrors C08_Timesheet from legacy DMCTimesheet
// ============================================================
export async function getTaskLogs(employeeId: number, date: string): Promise<TaskLog[]> {
  const pool = getBimDb();
  const result = await pool
    .request()
    .input('EmpID', sql.Int, employeeId)
    .input('Date', sql.Date, date)
    .query(`
      SELECT tl.*, p.ProjectName, p.MaDuAn,
             wg.GroupName, wt.TypeName, da.ActionName
      FROM BIMdb_Schema.TaskLogs tl
      LEFT JOIN dmcDb_Schema.Projects p ON p.ProjectID = tl.ProjectID
      LEFT JOIN BIMdb_Schema.WorkGroups wg ON wg.WorkGroupID = tl.WorkGroupID
      LEFT JOIN BIMdb_Schema.WorkTypes wt ON wt.WorkTypeID = tl.WorkTypeID
      LEFT JOIN BIMdb_Schema.WorkDetailActions da ON da.DetailActionID = tl.DetailActionID
      WHERE tl.EmployeeID = @EmpID AND tl.WorkDate = @Date
      ORDER BY tl.CreatedAt
    `);
  return result.recordset.map(mapTaskLog);
}

export async function createTaskLog(employeeId: number, input: TaskLogInput): Promise<TaskLog> {
  const pool = getBimDb();
  const date = input.workDate ?? new Date().toISOString().slice(0, 10);

  // Ensure TimesheetEntry exists for this date (upsert)
  await pool.request()
    .input('EmpID', sql.Int, employeeId)
    .input('Date', sql.Date, date)
    .query(`
      IF NOT EXISTS (
        SELECT 1 FROM BIMdb_Schema.TimesheetEntries
        WHERE EmployeeID = @EmpID AND WorkDate = @Date
      )
      INSERT INTO BIMdb_Schema.TimesheetEntries (EmployeeID, WorkDate, Status)
      VALUES (@EmpID, @Date, 'DRAFT')
    `);

  const result = await pool
    .request()
    .input('EmpID', sql.Int, employeeId)
    .input('Date', sql.Date, date)
    .input('ProjectID', sql.Int, input.projectId ?? null)
    .input('WorkGroupID', sql.Int, input.workGroupId)
    .input('WorkTypeID', sql.Int, input.workTypeId)
    .input('DetailActionID', sql.Int, input.detailActionId ?? null)
    .input('Hours', sql.Decimal(5, 2), input.hours)
    .input('OTHours', sql.Decimal(5, 2), input.overtimeHours ?? 0)
    .input('Description', sql.NVarChar(500), input.description ?? null)
    .input('Confirmed', sql.Bit, input.isConfirmed ?? 0)
    .query(`
      INSERT INTO BIMdb_Schema.TaskLogs
        (EmployeeID, WorkDate, ProjectID, WorkGroupID, WorkTypeID, DetailActionID,
         Hours, OvertimeHours, Description, IsConfirmed)
      VALUES
        (@EmpID, @Date, @ProjectID, @WorkGroupID, @WorkTypeID, @DetailActionID,
         @Hours, @OTHours, @Description, @Confirmed);

      SELECT tl.*, wg.GroupName, wt.TypeName, da.ActionName
      FROM BIMdb_Schema.TaskLogs tl
      LEFT JOIN BIMdb_Schema.WorkGroups wg ON wg.WorkGroupID = tl.WorkGroupID
      LEFT JOIN BIMdb_Schema.WorkTypes wt ON wt.WorkTypeID = tl.WorkTypeID
      LEFT JOIN BIMdb_Schema.WorkDetailActions da ON da.DetailActionID = tl.DetailActionID
      WHERE tl.LogID = SCOPE_IDENTITY();
    `);

  return mapTaskLog(result.recordset[0]);
}

export async function updateTaskLog(
  employeeId: number,
  logId: number,
  input: Partial<TaskLogInput>
): Promise<TaskLog> {
  const pool = getBimDb();

  // Verify ownership and not locked
  const check = await pool.request()
    .input('LogID', sql.BigInt, logId)
    .input('EmpID', sql.Int, employeeId)
    .query(`
      SELECT tl.LogID, te.Status
      FROM BIMdb_Schema.TaskLogs tl
      JOIN BIMdb_Schema.TimesheetEntries te
        ON te.EmployeeID = tl.EmployeeID AND te.WorkDate = tl.WorkDate
      WHERE tl.LogID = @LogID AND tl.EmployeeID = @EmpID
    `);

  if (!check.recordset[0]) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy bản ghi');
  if (check.recordset[0]['Status'] === 'LOCKED')
    throw new AppError(409, 'LOCKED', 'Tuần đã bị khóa, không thể chỉnh sửa');
  if (check.recordset[0]['Status'] === 'APPROVED')
    throw new AppError(409, 'APPROVED', 'Bản ghi đã được duyệt, không thể chỉnh sửa');

  await pool.request()
    .input('LogID', sql.BigInt, logId)
    .input('ProjectID', sql.Int, input.projectId ?? null)
    .input('WorkGroupID', sql.Int, input.workGroupId ?? null)
    .input('WorkTypeID', sql.Int, input.workTypeId ?? null)
    .input('DetailActionID', sql.Int, input.detailActionId ?? null)
    .input('Hours', sql.Decimal(5, 2), input.hours ?? null)
    .input('OTHours', sql.Decimal(5, 2), input.overtimeHours ?? null)
    .input('Description', sql.NVarChar(500), input.description ?? null)
    .input('Confirmed', sql.Bit, input.isConfirmed ?? null)
    .query(`
      UPDATE BIMdb_Schema.TaskLogs SET
        ProjectID     = COALESCE(@ProjectID, ProjectID),
        WorkGroupID   = COALESCE(@WorkGroupID, WorkGroupID),
        WorkTypeID    = COALESCE(@WorkTypeID, WorkTypeID),
        DetailActionID= COALESCE(@DetailActionID, DetailActionID),
        Hours         = COALESCE(@Hours, Hours),
        OvertimeHours = COALESCE(@OTHours, OvertimeHours),
        Description   = COALESCE(@Description, Description),
        IsConfirmed   = COALESCE(@Confirmed, IsConfirmed),
        UpdatedAt     = GETUTCDATE()
      WHERE LogID = @LogID
    `);

  const result = await pool.request()
    .input('LogID', sql.BigInt, logId)
    .query(`
      SELECT tl.*, wg.GroupName, wt.TypeName, da.ActionName
      FROM BIMdb_Schema.TaskLogs tl
      LEFT JOIN BIMdb_Schema.WorkGroups wg ON wg.WorkGroupID = tl.WorkGroupID
      LEFT JOIN BIMdb_Schema.WorkTypes wt ON wt.WorkTypeID = tl.WorkTypeID
      LEFT JOIN BIMdb_Schema.WorkDetailActions da ON da.DetailActionID = tl.DetailActionID
      WHERE tl.LogID = @LogID
    `);

  return mapTaskLog(result.recordset[0]);
}

export async function deleteTaskLog(employeeId: number, logId: number): Promise<void> {
  const pool = getBimDb();

  const check = await pool.request()
    .input('LogID', sql.BigInt, logId)
    .input('EmpID', sql.Int, employeeId)
    .query(`
      SELECT tl.LogID, te.Status
      FROM BIMdb_Schema.TaskLogs tl
      JOIN BIMdb_Schema.TimesheetEntries te
        ON te.EmployeeID = tl.EmployeeID AND te.WorkDate = tl.WorkDate
      WHERE tl.LogID = @LogID AND tl.EmployeeID = @EmpID
    `);

  if (!check.recordset[0]) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy bản ghi');
  if (['LOCKED', 'APPROVED'].includes(check.recordset[0]['Status'] as string))
    throw new AppError(409, 'IMMUTABLE', 'Không thể xóa bản ghi đã duyệt hoặc đã khóa');

  await pool.request()
    .input('LogID', sql.BigInt, logId)
    .query(`DELETE FROM BIMdb_Schema.TaskLogs WHERE LogID = @LogID`);
}

// ============================================================
// MAPPER (TaskLog)
// ============================================================
function mapTaskLog(row: Record<string, unknown>): TaskLog {
  return {
    logId: row['LogID'] as number,
    entryId: row['EntryID'] as number | null,
    employeeId: row['EmployeeID'] as number,
    workDate: (row['WorkDate'] as Date).toISOString().slice(0, 10),
    projectId: row['ProjectID'] as number | null,
    projectName: row['ProjectName'] as string | null,
    maDuAn: row['MaDuAn'] as string | null,
    workGroupId: row['WorkGroupID'] as number,
    workTypeName: row['TypeName'] as string | null,
    workGroupName: row['GroupName'] as string | null,
    workTypeId: row['WorkTypeID'] as number,
    detailActionId: row['DetailActionID'] as number | null,
    detailActionName: row['ActionName'] as string | null,
    hours: Number(row['Hours']),
    overtimeHours: Number(row['OvertimeHours'] ?? 0),
    description: row['Description'] as string | null,
    isConfirmed: Boolean(row['IsConfirmed']),
    createdAt: (row['CreatedAt'] as Date).toISOString(),
    updatedAt: row['UpdatedAt'] ? (row['UpdatedAt'] as Date).toISOString() : null,
  };
}

// ============================================================
// MAPPER (TimesheetEntry)
// ============================================================
function mapEntry(row: Record<string, unknown>): TimesheetEntry {
  return {
    entryId: row['EntryID'] as number,
    employeeId: row['EmployeeID'] as number,
    workDate: (row['WorkDate'] as Date).toISOString().slice(0, 10),
    clockInTime: row['ClockInTime'] ? (row['ClockInTime'] as Date).toISOString() : null,
    clockOutTime: row['ClockOutTime'] ? (row['ClockOutTime'] as Date).toISOString() : null,
    breakMinutes: (row['BreakMinutes'] as number) ?? 0,
    netHoursWorked: row['NetHoursWorked'] != null ? Number(row['NetHoursWorked']) : null,
    overtimeHours: row['OvertimeHours'] != null ? Number(row['OvertimeHours']) : null,
    status: row['Status'] as TimesheetEntry['status'],
    submittedAt: row['SubmittedAt'] ? (row['SubmittedAt'] as Date).toISOString() : null,
    approvedById: row['ApprovedByID'] as number | null,
    approvedAt: row['ApprovedAt'] ? (row['ApprovedAt'] as Date).toISOString() : null,
    rejectionNote: row['RejectionNote'] as string | null,
    notes: row['Notes'] as string | null,
    locationLat: row['LocationLat'] as number | null,
    locationLng: row['LocationLng'] as number | null,
    clockInSource: (row['ClockInSource'] as TimesheetEntry['clockInSource']) ?? 'WEB',
    createdAt: (row['CreatedAt'] as Date).toISOString(),
    updatedAt: (row['UpdatedAt'] as Date).toISOString(),
    employee: row['FirstName']
      ? {
          employeeId: row['EmployeeID'] as number,
          firstName: row['FirstName'] as string,
          lastName: row['LastName'] as string,
          employeeCode: row['EmployeeCode'] as string,
        }
      : undefined,
  };
}
