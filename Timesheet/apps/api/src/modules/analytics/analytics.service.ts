import { getBimDb, getDmcDb, sql } from '../../config/database.js';
import type {
  OvertimeData, AttendanceData, ProductivityData,
  BudgetBurnData, DashboardSummary,
} from '@bim/shared-types';

// ============================================================
// DASHBOARD SUMMARY (role-aware)
// ============================================================
export async function getDashboardSummary(
  employeeId: number,
  hierarchyLevel: number,
  departmentId: number
): Promise<DashboardSummary> {
  const pool = getBimDb();
  const monday = getThisMonday();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const myHours = await pool.request()
    .input('EmpID', sql.Int, employeeId)
    .input('Start', sql.Date, monday.toISOString().slice(0, 10))
    .input('End', sql.Date, sunday.toISOString().slice(0, 10))
    .query(`
      SELECT
        ISNULL(SUM(TotalHours), 0) AS TotalHours,
        ISNULL(SUM(OvertimeHours), 0) AS OvertimeHours
      FROM BIMdb_Schema.TimesheetEntries
      WHERE EmployeeID = @EmpID AND WorkDate BETWEEN @Start AND @End
        AND Status != 'REJECTED'
    `);

  const summary: DashboardSummary = {
    myHoursThisWeek: Number(myHours.recordset[0]?.['TotalHours'] ?? 0),
    myOvertimeThisWeek: Number(myHours.recordset[0]?.['OvertimeHours'] ?? 0),
    pendingApprovals: 0,
  };

  if (hierarchyLevel >= 2) {
    const pending = await pool.request()
      .input('DeptID', sql.Int, departmentId)
      .query(`
        SELECT COUNT(*) AS Cnt
        FROM BIMdb_Schema.TimesheetEntries t
        JOIN BIMdb_Schema.Employees e ON t.EmployeeID = e.EmployeeID
        WHERE t.Status = 'SUBMITTED'
          AND (${hierarchyLevel >= 4 ? '1=1' : 'e.DepartmentID = @DeptID'})
      `);
    summary.pendingApprovals = Number(pending.recordset[0]?.['Cnt'] ?? 0);
  }

  if (hierarchyLevel >= 3) {
    const adminStats = await pool.request()
      .input('Start', sql.Date, monday.toISOString().slice(0, 10))
      .input('End', sql.Date, sunday.toISOString().slice(0, 10))
      .query(`
        SELECT
          (SELECT COUNT(*) FROM BIMdb_Schema.Employees WHERE IsActive = 1) AS TotalEmployees,
          ISNULL(SUM(t.TotalHours), 0) AS CompanyHours,
          ISNULL(SUM(t.OvertimeHours), 0) AS TotalOT,
          (SELECT COUNT(DISTINCT t2.EmployeeID)
           FROM BIMdb_Schema.TimesheetEntries t2
           WHERE t2.WorkDate BETWEEN @Start AND @End
             AND t2.OvertimeHours > 2) AS OTRiskCount,
          (SELECT COUNT(*) FROM BIMdb_Schema.LeaveRequests WHERE Status = 'PENDING') AS PendingLeave
        FROM BIMdb_Schema.TimesheetEntries t
        WHERE t.WorkDate BETWEEN @Start AND @End AND t.Status != 'REJECTED'
      `);

    const row = adminStats.recordset[0];
    summary.totalActiveEmployees = Number(row?.['TotalEmployees'] ?? 0);
    summary.companyHoursThisWeek = Number(row?.['CompanyHours'] ?? 0);
    summary.overtimeRiskCount = Number(row?.['OTRiskCount'] ?? 0);
    summary.pendingLeaveRequests = Number(row?.['PendingLeave'] ?? 0);

    const trend = await pool.request().query(`
      SELECT
        DATEADD(DAY, 2 - DATEPART(WEEKDAY, WorkDate), WorkDate) AS WeekStart,
        SUM(TotalHours) AS Hours
      FROM BIMdb_Schema.TimesheetEntries
      WHERE WorkDate >= DATEADD(WEEK, -8, GETDATE()) AND Status != 'REJECTED'
      GROUP BY DATEADD(DAY, 2 - DATEPART(WEEKDAY, WorkDate), WorkDate)
      ORDER BY WeekStart
    `);
    summary.weeklyHoursTrend = trend.recordset.map(r => ({
      week: (r['WeekStart'] as Date).toISOString().slice(0, 10),
      hours: Number(r['Hours'] ?? 0),
    }));
  }

  return summary;
}

// ============================================================
// OVERTIME ANALYSIS (last N weeks)
// ============================================================
export async function getOvertimeAnalysis(
  weeks: number = 4,
  departmentId?: number,
  hierarchyLevel: number = 1,
  requesterDeptId: number = 0
): Promise<OvertimeData[]> {
  const pool = getBimDb();
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);

  const deptFilter = hierarchyLevel >= 4
    ? ''
    : departmentId
      ? `AND e.DepartmentID = ${departmentId}`
      : `AND e.DepartmentID = ${requesterDeptId}`;

  const result = await pool.request()
    .input('Since', sql.Date, since.toISOString().slice(0, 10))
    .query(`
      SELECT
        e.EmployeeID,
        e.FirstName + ' ' + e.LastName AS FullName,
        d.DeptName,
        disc.DisciplineCode,
        DATEADD(DAY, 2 - DATEPART(WEEKDAY, t.WorkDate), t.WorkDate) AS WeekStart,
        SUM(t.TotalHours) AS TotalHours,
        SUM(ISNULL(t.OvertimeHours, 0)) AS OvertimeHours,
        COUNT(*) AS DaysWorked
      FROM BIMdb_Schema.TimesheetEntries t
      JOIN BIMdb_Schema.Employees e ON t.EmployeeID = e.EmployeeID
      LEFT JOIN BIMdb_Schema.Departments d ON e.DepartmentID = d.DepartmentID
      LEFT JOIN BIMdb_Schema.Disciplines disc ON e.DisciplineID = disc.DisciplineID
      WHERE t.WorkDate >= @Since AND t.Status != 'REJECTED' AND e.IsActive = 1
        ${deptFilter}
      GROUP BY e.EmployeeID, e.FirstName, e.LastName, d.DeptName, disc.DisciplineCode,
               DATEADD(DAY, 2 - DATEPART(WEEKDAY, t.WorkDate), t.WorkDate)
      ORDER BY e.EmployeeID, WeekStart
    `);

  const byEmployee = new Map<number, OvertimeData>();
  for (const row of result.recordset) {
    const id = row['EmployeeID'] as number;
    if (!byEmployee.has(id)) {
      byEmployee.set(id, {
        employeeId: id,
        employeeName: row['FullName'] as string,
        department: (row['DeptName'] ?? '') as string,
        disciplineCode: (row['DisciplineCode'] ?? '') as string,
        weeklyData: [],
        riskLevel: 'LOW',
        consecutiveOvertimeWeeks: 0,
      });
    }
    const emp = byEmployee.get(id)!;
    const ot = Number(row['OvertimeHours'] ?? 0);
    emp.weeklyData.push({
      weekStart: (row['WeekStart'] as Date).toISOString().slice(0, 10),
      totalHours: Number(row['TotalHours'] ?? 0),
      overtimeHours: ot,
      daysWorked: Number(row['DaysWorked'] ?? 0),
    });
  }

  for (const emp of byEmployee.values()) {
    let consecutive = 0;
    let maxConsecutive = 0;
    for (const week of emp.weeklyData) {
      if (week.overtimeHours > 0) {
        consecutive++;
        maxConsecutive = Math.max(maxConsecutive, consecutive);
      } else {
        consecutive = 0;
      }
    }
    emp.consecutiveOvertimeWeeks = maxConsecutive;
    const totalOT = emp.weeklyData.reduce((s, w) => s + w.overtimeHours, 0);

    if (maxConsecutive >= 4 || totalOT > 20) emp.riskLevel = 'CRITICAL';
    else if (maxConsecutive >= 3 || totalOT > 12) emp.riskLevel = 'HIGH';
    else if (maxConsecutive >= 2 || totalOT > 6) emp.riskLevel = 'MEDIUM';
  }

  return Array.from(byEmployee.values()).sort((a, b) => {
    const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return order[a.riskLevel] - order[b.riskLevel];
  });
}

// ============================================================
// BUDGET BURN RATES (all active projects, cross-db)
// ============================================================
export async function getBudgetBurnRates(projectIds?: number[]): Promise<BudgetBurnData[]> {
  const bimPool = getBimDb();
  const dmcPool = getDmcDb();

  // Actual hours from task logs (new schema uses Hours column directly)
  const actualHoursResult = await bimPool.request().query(`
    SELECT tl.ProjectID, SUM(tl.Hours) AS ActualHours
    FROM BIMdb_Schema.TaskLogs tl
    WHERE tl.ProjectID IS NOT NULL
    GROUP BY tl.ProjectID
  `);

  const actualHoursMap = new Map<number, number>();
  for (const row of actualHoursResult.recordset) {
    if (row['ProjectID']) {
      actualHoursMap.set(row['ProjectID'] as number, Number(row['ActualHours'] ?? 0));
    }
  }

  // Weekly hours per project (last 4 weeks)
  const weeklyResult = await bimPool.request().query(`
    SELECT tl.ProjectID, SUM(tl.Hours) AS WeeklyHours
    FROM BIMdb_Schema.TaskLogs tl
    WHERE tl.WorkDate >= DATEADD(WEEK, -1, GETDATE())
      AND tl.ProjectID IS NOT NULL
    GROUP BY tl.ProjectID
  `);
  const weeklyMap = new Map<number, number>();
  for (const row of weeklyResult.recordset) {
    weeklyMap.set(row['ProjectID'] as number, Number(row['WeeklyHours'] ?? 0));
  }

  // Project metadata from DMCdb
  const projectResult = await dmcPool.request().query(`
    SELECT p.ProjectID, p.MaDuAn, p.ProjectCode, p.ProjectName, p.BudgetHours,
           p.StartDate, p.PlannedEndDate,
           s.StatusCode, s.ColorCode
    FROM dmcDb_Schema.Projects p
    LEFT JOIN dmcDb_Schema.ProjectStatuses s ON s.StatusID = p.StatusID
    WHERE p.IsActive = 1 AND s.StatusCode IN ('ACTIVE', 'ON_HOLD')
    ORDER BY p.MaDuAn
  `);

  return projectResult.recordset.map(row => {
    const projectId = row['ProjectID'] as number;
    const budgetHours = Number(row['BudgetHours'] ?? 0);
    const actualHours = actualHoursMap.get(projectId) ?? 0;
    const weeklyHours = weeklyMap.get(projectId) ?? 0;
    const burnRate = budgetHours > 0 ? actualHours / budgetHours : 0;
    const projectedTotal = weeklyHours > 0 ? actualHours + weeklyHours * 4 : null;
    const projectedOverrun = projectedTotal != null ? projectedTotal - budgetHours : null;

    let riskLevel: BudgetBurnData['riskLevel'] = 'ON_TRACK';
    if (burnRate > 1.0) riskLevel = 'OVER_BUDGET';
    else if (burnRate > 0.8) riskLevel = 'AT_RISK';

    return {
      projectId,
      maDuAn: row['MaDuAn'] as string,
      projectCode: row['ProjectCode'] as string | null,
      projectName: row['ProjectName'] as string,
      budgetHours,
      actualHours,
      burnRate: Math.round(burnRate * 1000) / 1000,
      weeklyHours,
      projectedTotal,
      projectedOverrun,
      riskLevel,
      statusColor: (row['ColorCode'] ?? '#6B7280') as string,
    };
  });
}

// ============================================================
// ATTENDANCE
// ============================================================
export async function getAttendanceData(
  startDate: string,
  endDate: string,
  departmentId?: number
): Promise<AttendanceData[]> {
  const pool = getBimDb();
  const deptFilter = departmentId ? `AND e.DepartmentID = @DeptID` : '';

  const result = await pool.request()
    .input('Start', sql.Date, startDate)
    .input('End', sql.Date, endDate)
    .input('DeptID', sql.Int, departmentId ?? null)
    .query(`
      SELECT
        t.WorkDate,
        e.DepartmentID,
        d.DeptName,
        COUNT(DISTINCT e.EmployeeID) AS PresentCount,
        COUNT(DISTINCT CASE WHEN CAST(t.ClockInTime AS TIME) > '09:00' THEN e.EmployeeID END) AS LateArrivals,
        COUNT(DISTINCT CASE WHEN t.ClockOutTime IS NULL AND t.TotalHours IS NULL THEN e.EmployeeID END) AS NoCheckout,
        (SELECT COUNT(*) FROM BIMdb_Schema.Employees e2
         WHERE e2.IsActive = 1 AND e2.DepartmentID = e.DepartmentID
         ${departmentId ? 'AND e2.DepartmentID = @DeptID' : ''}) AS HeadCount
      FROM BIMdb_Schema.TimesheetEntries t
      JOIN BIMdb_Schema.Employees e ON t.EmployeeID = e.EmployeeID
      LEFT JOIN BIMdb_Schema.Departments d ON e.DepartmentID = d.DepartmentID
      WHERE t.WorkDate BETWEEN @Start AND @End
        AND t.Status != 'REJECTED' AND e.IsActive = 1
        ${deptFilter}
      GROUP BY t.WorkDate, e.DepartmentID, d.DeptName
      ORDER BY t.WorkDate, d.DeptName
    `);

  return result.recordset.map(row => ({
    date: (row['WorkDate'] as Date).toISOString().slice(0, 10),
    departmentId: row['DepartmentID'] as number,
    departmentName: (row['DeptName'] ?? '') as string,
    expectedHeadcount: Number(row['HeadCount'] ?? 0),
    actualPresentCount: Number(row['PresentCount'] ?? 0),
    attendanceRate: Number(row['HeadCount'] ?? 1) > 0
      ? Math.round((Number(row['PresentCount'] ?? 0) / Number(row['HeadCount'] ?? 1)) * 1000) / 10
      : 0,
    lateArrivals: Number(row['LateArrivals'] ?? 0),
    earlyDepartures: Number(row['NoCheckout'] ?? 0),
  }));
}

// ============================================================
// PRODUCTIVITY BREAKDOWN (by WorkGroup)
// ============================================================
export async function getProductivityBreakdown(
  employeeId: number,
  startDate: string,
  endDate: string
): Promise<ProductivityData> {
  const pool = getBimDb();

  // Hours by work group
  const groupResult = await pool.request()
    .input('EmpID', sql.Int, employeeId)
    .input('Start', sql.Date, startDate)
    .input('End', sql.Date, endDate)
    .query(`
      SELECT
        wg.GroupCode, wg.GroupName,
        SUM(tl.Hours) AS Hours
      FROM BIMdb_Schema.TaskLogs tl
      JOIN BIMdb_Schema.WorkGroups wg ON tl.WorkGroupID = wg.WorkGroupID
      WHERE tl.EmployeeID = @EmpID
        AND tl.WorkDate BETWEEN @Start AND @End
      GROUP BY wg.GroupCode, wg.GroupName
      ORDER BY Hours DESC
    `);

  // Top projects
  const projectResult = await pool.request()
    .input('EmpID', sql.Int, employeeId)
    .input('Start', sql.Date, startDate)
    .input('End', sql.Date, endDate)
    .query(`
      SELECT TOP 5 tl.ProjectID, SUM(tl.Hours) AS Hours
      FROM BIMdb_Schema.TaskLogs tl
      WHERE tl.EmployeeID = @EmpID
        AND tl.WorkDate BETWEEN @Start AND @End
        AND tl.ProjectID IS NOT NULL
      GROUP BY tl.ProjectID
      ORDER BY Hours DESC
    `);

  const totalHours = groupResult.recordset.reduce((s, r) => s + Number(r['Hours'] ?? 0), 0);

  // Fetch project names from DMC db
  const dmcPool = getDmcDb();
  const projectIds = projectResult.recordset.map(r => r['ProjectID'] as number);
  let projectNames = new Map<number, { maDuAn: string; projectName: string }>();

  if (projectIds.length > 0) {
    const ids = projectIds.join(',');
    const pRes = await dmcPool.request().query(
      `SELECT ProjectID, MaDuAn, ProjectName FROM dmcDb_Schema.Projects WHERE ProjectID IN (${ids})`
    );
    for (const r of pRes.recordset) {
      projectNames.set(r['ProjectID'] as number, {
        maDuAn: r['MaDuAn'] as string,
        projectName: r['ProjectName'] as string,
      });
    }
  }

  return {
    employeeId,
    period: `${startDate}/${endDate}`,
    totalHours,
    workGroupBreakdown: groupResult.recordset.map(r => ({
      groupCode: r['GroupCode'] as string,
      groupName: r['GroupName'] as string,
      hours: Number(r['Hours'] ?? 0),
      percentage: totalHours > 0
        ? Math.round((Number(r['Hours'] ?? 0) / totalHours) * 1000) / 10
        : 0,
    })),
    topProjects: projectResult.recordset.map(r => {
      const pid = r['ProjectID'] as number;
      const info = projectNames.get(pid);
      return {
        projectId: pid,
        maDuAn: info?.maDuAn ?? `PRJ-${pid}`,
        projectName: info?.projectName ?? `Project ${pid}`,
        hours: Number(r['Hours'] ?? 0),
      };
    }),
  };
}

// ============================================================
// HELPERS
// ============================================================
function getThisMonday(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}
