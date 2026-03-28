import { getBimDb, sql } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { LeaveRequest, LeaveBalance } from '@bim/shared-types';

// ============================================================
// LEAVE TYPES
// ============================================================
export async function getLeaveTypes() {
  const pool = getBimDb();
  const result = await pool.request().query(`
    SELECT LeaveTypeID, TypeCode, TypeName, MaxDaysPerYear, IsPaid, RequiresApproval, IsActive
    FROM BIMdb_Schema.LeaveTypes
    WHERE IsActive = 1
    ORDER BY TypeName
  `);
  return result.recordset.map(r => ({
    leaveTypeId: r['LeaveTypeID'] as number,
    typeCode: r['TypeCode'] as string,
    typeName: r['TypeName'] as string,
    maxDaysPerYear: r['MaxDaysPerYear'] as number | null,
    isPaid: Boolean(r['IsPaid']),
    requiresApproval: Boolean(r['RequiresApproval']),
    isActive: Boolean(r['IsActive']),
  }));
}

// ============================================================
// LEAVE BALANCES
// ============================================================
export async function getLeaveBalances(employeeId: number, year?: number): Promise<LeaveBalance[]> {
  const pool = getBimDb();
  const y = year ?? new Date().getFullYear();

  const result = await pool.request()
    .input('EmpID', sql.Int, employeeId)
    .input('Year', sql.SmallInt, y)
    .query(`
      SELECT lb.BalanceID, lb.EmployeeID, lb.LeaveTypeID, lb.Year,
             lb.AllowedDays, lb.UsedDays, lb.PendingDays, lb.CarryOverDays,
             lt.TypeCode, lt.TypeName, lt.IsPaid
      FROM BIMdb_Schema.LeaveBalances lb
      JOIN BIMdb_Schema.LeaveTypes lt ON lt.LeaveTypeID = lb.LeaveTypeID
      WHERE lb.EmployeeID = @EmpID AND lb.Year = @Year
      ORDER BY lt.TypeName
    `);

  return result.recordset.map(r => ({
    balanceId: r['BalanceID'] as number,
    employeeId: r['EmployeeID'] as number,
    leaveTypeId: r['LeaveTypeID'] as number,
    year: r['Year'] as number,
    allowedDays: Number(r['AllowedDays']),
    usedDays: Number(r['UsedDays']),
    pendingDays: Number(r['PendingDays']),
    carryOverDays: Number(r['CarryOverDays'] ?? 0),
    remainingDays: Number(r['AllowedDays']) + Number(r['CarryOverDays'] ?? 0) - Number(r['UsedDays']) - Number(r['PendingDays']),
    leaveType: {
      leaveTypeId: r['LeaveTypeID'] as number,
      typeCode: r['TypeCode'] as string,
      typeName: r['TypeName'] as string,
      isPaid: Boolean(r['IsPaid']),
    },
  }));
}

// ============================================================
// LEAVE REQUESTS
// ============================================================
export interface LeaveRequestFilters {
  employeeId?: number;
  status?: string;
  year?: number;
  page?: number;
  pageSize?: number;
}

export async function listLeaveRequests(filters: LeaveRequestFilters = {}): Promise<{
  data: LeaveRequest[];
  total: number;
}> {
  const pool = getBimDb();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, filters.pageSize ?? 20);
  const offset = (page - 1) * pageSize;

  const result = await pool.request()
    .input('EmpID', sql.Int, filters.employeeId ?? null)
    .input('Status', sql.NVarChar(20), filters.status ?? null)
    .input('Year', sql.SmallInt, filters.year ?? null)
    .input('Offset', sql.Int, offset)
    .input('PageSize', sql.Int, pageSize)
    .query(`
      SELECT
        lr.RequestID, lr.EmployeeID, lr.LeaveTypeID, lr.StartDate, lr.EndDate,
        lr.TotalDays, lr.Reason, lr.Status, lr.ApprovedByID, lr.ApprovedAt,
        lr.RejectionNote, lr.CreatedAt,
        lt.TypeCode, lt.TypeName, lt.IsPaid,
        e.FirstName, e.LastName, e.EmployeeCode,
        COUNT(*) OVER () AS TotalCount
      FROM BIMdb_Schema.LeaveRequests lr
      JOIN BIMdb_Schema.LeaveTypes lt ON lt.LeaveTypeID = lr.LeaveTypeID
      JOIN BIMdb_Schema.Employees e ON e.EmployeeID = lr.EmployeeID
      WHERE (@EmpID IS NULL OR lr.EmployeeID = @EmpID)
        AND (@Status IS NULL OR lr.Status = @Status)
        AND (@Year IS NULL OR YEAR(lr.StartDate) = @Year)
      ORDER BY lr.CreatedAt DESC
      OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY
    `);

  const total = result.recordset[0]?.TotalCount ?? 0;
  return { data: result.recordset.map(mapLeaveRequest), total };
}

// ============================================================
// CREATE REQUEST
// ============================================================
export interface CreateLeaveInput {
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason?: string;
}

export async function createLeaveRequest(employeeId: number, input: CreateLeaveInput): Promise<LeaveRequest> {
  const pool = getBimDb();
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);

  // Count working days (simple — exclude weekends, not holidays)
  let totalDays = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) totalDays++;
    cursor.setDate(cursor.getDate() + 1);
  }
  if (totalDays === 0) throw new AppError(400, 'INVALID_DATES', 'Không có ngày làm việc trong khoảng thời gian này');

  // Check balance
  const year = start.getFullYear();
  const balance = await pool.request()
    .input('EmpID', sql.Int, employeeId)
    .input('TypeID', sql.Int, input.leaveTypeId)
    .input('Year', sql.SmallInt, year)
    .query(`
      SELECT AllowedDays, UsedDays, PendingDays, CarryOverDays
      FROM BIMdb_Schema.LeaveBalances
      WHERE EmployeeID = @EmpID AND LeaveTypeID = @TypeID AND Year = @Year
    `);

  if (balance.recordset.length) {
    const b = balance.recordset[0];
    const remaining = Number(b['AllowedDays']) + Number(b['CarryOverDays'] ?? 0)
      - Number(b['UsedDays']) - Number(b['PendingDays']);
    if (totalDays > remaining) {
      throw new AppError(422, 'INSUFFICIENT_BALANCE',
        `Số ngày phép còn lại (${remaining}) không đủ cho yêu cầu (${totalDays} ngày)`);
    }
  }

  const result = await pool.request()
    .input('EmpID', sql.Int, employeeId)
    .input('TypeID', sql.Int, input.leaveTypeId)
    .input('Start', sql.Date, input.startDate)
    .input('End', sql.Date, input.endDate)
    .input('Days', sql.Decimal(5, 1), totalDays)
    .input('Reason', sql.NVarChar(500), input.reason ?? null)
    .query(`
      INSERT INTO BIMdb_Schema.LeaveRequests
        (EmployeeID, LeaveTypeID, StartDate, EndDate, TotalDays, Reason, Status)
      OUTPUT INSERTED.RequestID
      VALUES (@EmpID, @TypeID, @Start, @End, @Days, @Reason, 'PENDING');

      -- Update pending balance
      UPDATE BIMdb_Schema.LeaveBalances
      SET PendingDays = PendingDays + @Days
      WHERE EmployeeID = @EmpID AND LeaveTypeID = @TypeID AND Year = @Year;
    `);

  const requestId = result.recordset[0]['RequestID'] as number;
  return getLeaveRequestById(requestId);
}

// ============================================================
// GET BY ID
// ============================================================
export async function getLeaveRequestById(requestId: number): Promise<LeaveRequest> {
  const pool = getBimDb();
  const result = await pool.request()
    .input('ID', sql.Int, requestId)
    .query(`
      SELECT lr.*, lt.TypeCode, lt.TypeName, lt.IsPaid,
             e.FirstName, e.LastName, e.EmployeeCode
      FROM BIMdb_Schema.LeaveRequests lr
      JOIN BIMdb_Schema.LeaveTypes lt ON lt.LeaveTypeID = lr.LeaveTypeID
      JOIN BIMdb_Schema.Employees e ON e.EmployeeID = lr.EmployeeID
      WHERE lr.RequestID = @ID
    `);

  if (!result.recordset[0]) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy yêu cầu');
  return mapLeaveRequest(result.recordset[0]);
}

// ============================================================
// APPROVE / REJECT
// ============================================================
export async function approveLeaveRequest(managerId: number, requestId: number): Promise<LeaveRequest> {
  const pool = getBimDb();
  const req = await getLeaveRequestById(requestId);
  if (req.status !== 'PENDING') throw new AppError(409, 'NOT_PENDING', 'Yêu cầu không ở trạng thái chờ duyệt');

  await pool.request()
    .input('ID', sql.Int, requestId)
    .input('MgrID', sql.Int, managerId)
    .query(`
      UPDATE BIMdb_Schema.LeaveRequests
      SET Status = 'APPROVED', ApprovedByID = @MgrID, ApprovedAt = GETUTCDATE()
      WHERE RequestID = @ID;

      -- Move from pending to used
      UPDATE BIMdb_Schema.LeaveBalances
      SET UsedDays = UsedDays + (SELECT TotalDays FROM BIMdb_Schema.LeaveRequests WHERE RequestID = @ID),
          PendingDays = PendingDays - (SELECT TotalDays FROM BIMdb_Schema.LeaveRequests WHERE RequestID = @ID)
      WHERE EmployeeID = (SELECT EmployeeID FROM BIMdb_Schema.LeaveRequests WHERE RequestID = @ID)
        AND LeaveTypeID = (SELECT LeaveTypeID FROM BIMdb_Schema.LeaveRequests WHERE RequestID = @ID)
        AND Year = YEAR((SELECT StartDate FROM BIMdb_Schema.LeaveRequests WHERE RequestID = @ID));
    `);

  return getLeaveRequestById(requestId);
}

export async function rejectLeaveRequest(
  managerId: number,
  requestId: number,
  note: string
): Promise<LeaveRequest> {
  const pool = getBimDb();
  const req = await getLeaveRequestById(requestId);
  if (req.status !== 'PENDING') throw new AppError(409, 'NOT_PENDING', 'Yêu cầu không ở trạng thái chờ duyệt');

  await pool.request()
    .input('ID', sql.Int, requestId)
    .input('MgrID', sql.Int, managerId)
    .input('Note', sql.NVarChar(500), note)
    .query(`
      UPDATE BIMdb_Schema.LeaveRequests
      SET Status = 'REJECTED', ApprovedByID = @MgrID, ApprovedAt = GETUTCDATE(), RejectionNote = @Note
      WHERE RequestID = @ID;

      -- Release pending balance
      UPDATE BIMdb_Schema.LeaveBalances
      SET PendingDays = PendingDays - (SELECT TotalDays FROM BIMdb_Schema.LeaveRequests WHERE RequestID = @ID)
      WHERE EmployeeID = (SELECT EmployeeID FROM BIMdb_Schema.LeaveRequests WHERE RequestID = @ID)
        AND LeaveTypeID = (SELECT LeaveTypeID FROM BIMdb_Schema.LeaveRequests WHERE RequestID = @ID)
        AND Year = YEAR((SELECT StartDate FROM BIMdb_Schema.LeaveRequests WHERE RequestID = @ID));
    `);

  return getLeaveRequestById(requestId);
}

// ============================================================
// CANCEL (self)
// ============================================================
export async function cancelLeaveRequest(employeeId: number, requestId: number): Promise<void> {
  const pool = getBimDb();
  const req = await getLeaveRequestById(requestId);

  if (req.employeeId !== employeeId) throw new AppError(403, 'FORBIDDEN', 'Không có quyền hủy yêu cầu này');
  if (!['PENDING'].includes(req.status))
    throw new AppError(409, 'CANNOT_CANCEL', 'Chỉ có thể hủy yêu cầu đang chờ duyệt');

  await pool.request()
    .input('ID', sql.Int, requestId)
    .query(`
      UPDATE BIMdb_Schema.LeaveRequests SET Status = 'CANCELLED' WHERE RequestID = @ID;

      UPDATE BIMdb_Schema.LeaveBalances
      SET PendingDays = PendingDays - (SELECT TotalDays FROM BIMdb_Schema.LeaveRequests WHERE RequestID = @ID)
      WHERE EmployeeID = (SELECT EmployeeID FROM BIMdb_Schema.LeaveRequests WHERE RequestID = @ID)
        AND LeaveTypeID = (SELECT LeaveTypeID FROM BIMdb_Schema.LeaveRequests WHERE RequestID = @ID)
        AND Year = YEAR((SELECT StartDate FROM BIMdb_Schema.LeaveRequests WHERE RequestID = @ID));
    `);
}

// ============================================================
// MAPPER
// ============================================================
function mapLeaveRequest(row: Record<string, unknown>): LeaveRequest {
  return {
    requestId: row['RequestID'] as number,
    employeeId: row['EmployeeID'] as number,
    leaveTypeId: row['LeaveTypeID'] as number,
    startDate: (row['StartDate'] as Date).toISOString().slice(0, 10),
    endDate: (row['EndDate'] as Date).toISOString().slice(0, 10),
    totalDays: Number(row['TotalDays']),
    reason: row['Reason'] as string | null,
    status: row['Status'] as LeaveRequest['status'],
    approvedById: row['ApprovedByID'] as number | null,
    approvedAt: row['ApprovedAt'] ? (row['ApprovedAt'] as Date).toISOString() : null,
    rejectionNote: row['RejectionNote'] as string | null,
    createdAt: (row['CreatedAt'] as Date).toISOString(),
    leaveType: row['TypeCode']
      ? {
          leaveTypeId: row['LeaveTypeID'] as number,
          typeCode: row['TypeCode'] as string,
          typeName: row['TypeName'] as string,
          isPaid: Boolean(row['IsPaid']),
        }
      : undefined,
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
