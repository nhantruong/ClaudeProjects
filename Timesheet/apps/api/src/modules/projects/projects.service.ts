import { getDmcDb, getBimDb, sql } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { Project } from '@bim/shared-types';

// ============================================================
// LIST / SEARCH
// ============================================================
export interface ProjectFilters {
  statusId?: number;
  typeId?: number;
  year?: number;
  pmEmployeeId?: number;
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listProjects(filters: ProjectFilters = {}): Promise<{
  data: Project[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const pool = getDmcDb();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, filters.pageSize ?? 20);
  const offset = (page - 1) * pageSize;

  const result = await pool.request()
    .input('StatusID', sql.Int, filters.statusId ?? null)
    .input('TypeID', sql.Int, filters.typeId ?? null)
    .input('Year', sql.SmallInt, filters.year ?? null)
    .input('PmID', sql.Int, filters.pmEmployeeId ?? null)
    .input('Active', sql.Bit, filters.isActive != null ? (filters.isActive ? 1 : 0) : 1)
    .input('Search', sql.NVarChar(100), filters.search ? `%${filters.search}%` : null)
    .input('Offset', sql.Int, offset)
    .input('PageSize', sql.Int, pageSize)
    .query(`
      SELECT
        p.ProjectID, p.MaDuAn, p.ProjectCode, p.ProjectName, p.ProjectOtherName,
        p.ClientID, p.TypeID, p.StatusID, p.StageID, p.LocationID,
        p.StartDate, p.PlannedEndDate, p.ActualEndDate, p.Year,
        p.BudgetHours, p.BudgetAmount, p.CurrencyCode,
        p.DienTich, p.PMEmployeeID,
        p.ChuTriChinh, p.ChuTriKienTruc, p.ChuTriKetCau, p.ChuTriMEP, p.BIMManager,
        p.BIMSoftware, p.IsInternal, p.IsActive, p.Image,
        p.CreatedAt, p.UpdatedAt,
        c.ClientName, c.ShortName AS ClientShortName,
        s.StatusName, s.ColorCode AS StatusColor,
        t.TypeName,
        st.StageName,
        l.LocationName,
        COUNT(*) OVER () AS TotalCount
      FROM dmcDb_Schema.Projects p
      LEFT JOIN dmcDb_Schema.Clients c ON c.ClientID = p.ClientID
      LEFT JOIN dmcDb_Schema.ProjectStatuses s ON s.StatusID = p.StatusID
      LEFT JOIN dmcDb_Schema.ProjectTypes t ON t.TypeID = p.TypeID
      LEFT JOIN dmcDb_Schema.ProjectStages st ON st.StageID = p.StageID
      LEFT JOIN dmcDb_Schema.Locations l ON l.LocationID = p.LocationID
      WHERE (@Active IS NULL OR p.IsActive = @Active)
        AND (@StatusID IS NULL OR p.StatusID = @StatusID)
        AND (@TypeID IS NULL OR p.TypeID = @TypeID)
        AND (@Year IS NULL OR p.Year = @Year)
        AND (@PmID IS NULL OR p.PMEmployeeID = @PmID)
        AND (@Search IS NULL OR p.ProjectName LIKE @Search
             OR p.MaDuAn LIKE @Search OR p.ProjectCode LIKE @Search
             OR p.ProjectOtherName LIKE @Search)
      ORDER BY p.Year DESC, p.MaDuAn
      OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY
    `);

  const total = result.recordset[0]?.TotalCount ?? 0;
  return { data: result.recordset.map(mapProject), total, page, pageSize };
}

// ============================================================
// GET BY ID (with phases and members)
// ============================================================
export async function getProjectById(id: number): Promise<Project> {
  const pool = getDmcDb();
  const result = await pool.request()
    .input('ID', sql.Int, id)
    .query(`
      SELECT
        p.*,
        c.ClientName, c.ShortName AS ClientShortName,
        s.StatusName, s.ColorCode AS StatusColor,
        t.TypeName, st.StageName, l.LocationName
      FROM dmcDb_Schema.Projects p
      LEFT JOIN dmcDb_Schema.Clients c ON c.ClientID = p.ClientID
      LEFT JOIN dmcDb_Schema.ProjectStatuses s ON s.StatusID = p.StatusID
      LEFT JOIN dmcDb_Schema.ProjectTypes t ON t.TypeID = p.TypeID
      LEFT JOIN dmcDb_Schema.ProjectStages st ON st.StageID = p.StageID
      LEFT JOIN dmcDb_Schema.Locations l ON l.LocationID = p.LocationID
      WHERE p.ProjectID = @ID
    `);

  if (!result.recordset[0]) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy dự án');

  const project = mapProject(result.recordset[0]);

  // Phases
  const phasesResult = await pool.request()
    .input('ID', sql.Int, id)
    .query(`
      SELECT PhaseID, ProjectID, PhaseName, PhaseCode, PhaseOrder,
             BudgetHours, StartDate, EndDate, Status, Description
      FROM dmcDb_Schema.ProjectPhases
      WHERE ProjectID = @ID
      ORDER BY PhaseOrder
    `);

  project.phases = phasesResult.recordset.map(r => ({
    phaseId: r['PhaseID'] as number,
    projectId: id,
    phaseName: r['PhaseName'] as string,
    phaseCode: r['PhaseCode'] as string | null,
    phaseOrder: r['PhaseOrder'] as number,
    budgetHours: Number(r['BudgetHours']),
    startDate: r['StartDate'] ? (r['StartDate'] as Date).toISOString().slice(0, 10) : null,
    endDate: r['EndDate'] ? (r['EndDate'] as Date).toISOString().slice(0, 10) : null,
    status: r['Status'] as string,
    description: r['Description'] as string | null,
  }));

  return project;
}

// ============================================================
// CREATE
// ============================================================
export interface CreateProjectInput {
  maDuAn: string;
  projectCode?: string;
  projectName: string;
  projectOtherName?: string;
  clientId?: number;
  typeId?: number;
  statusId?: number;
  stageId?: number;
  locationId?: number;
  startDate?: string;
  plannedEndDate?: string;
  year?: number;
  budgetHours?: number;
  budgetAmount?: number;
  currencyCode?: string;
  dienTich?: number;
  pmEmployeeId?: number;
  bimSoftware?: string;
  bimTarget?: string;
  isInternal?: boolean;
  projectScope?: string;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const pool = getDmcDb();

  const existing = await pool.request()
    .input('Code', sql.NVarChar(30), input.maDuAn)
    .query(`SELECT ProjectID FROM dmcDb_Schema.Projects WHERE MaDuAn = @Code`);
  if (existing.recordset.length) throw new AppError(409, 'CODE_EXISTS', 'Mã dự án đã tồn tại');

  const result = await pool.request()
    .input('MaDuAn', sql.NVarChar(30), input.maDuAn)
    .input('ProjectCode', sql.NVarChar(30), input.projectCode ?? null)
    .input('ProjectName', sql.NVarChar(200), input.projectName)
    .input('OtherName', sql.NVarChar(200), input.projectOtherName ?? null)
    .input('ClientID', sql.Int, input.clientId ?? null)
    .input('TypeID', sql.Int, input.typeId ?? null)
    .input('StatusID', sql.Int, input.statusId ?? 2)
    .input('StageID', sql.Int, input.stageId ?? null)
    .input('LocationID', sql.Int, input.locationId ?? null)
    .input('StartDate', sql.Date, input.startDate ?? null)
    .input('PlannedEnd', sql.Date, input.plannedEndDate ?? null)
    .input('Year', sql.SmallInt, input.year ?? new Date().getFullYear())
    .input('BudgetHours', sql.Decimal(10, 2), input.budgetHours ?? 0)
    .input('BudgetAmount', sql.Decimal(14, 2), input.budgetAmount ?? null)
    .input('Currency', sql.NChar(3), input.currencyCode ?? 'VND')
    .input('DienTich', sql.Decimal(12, 2), input.dienTich ?? null)
    .input('PmID', sql.Int, input.pmEmployeeId ?? null)
    .input('BIMSoftware', sql.NVarChar(100), input.bimSoftware ?? null)
    .input('BIMTarget', sql.NVarChar(500), input.bimTarget ?? null)
    .input('IsInternal', sql.Bit, input.isInternal ? 1 : 0)
    .input('Scope', sql.NVarChar(sql.MAX), input.projectScope ?? null)
    .query(`
      INSERT INTO dmcDb_Schema.Projects
        (MaDuAn, ProjectCode, ProjectName, ProjectOtherName, ClientID, TypeID, StatusID,
         StageID, LocationID, StartDate, PlannedEndDate, Year, BudgetHours, BudgetAmount,
         CurrencyCode, DienTich, PMEmployeeID, BIMSoftware, BIMTarget, IsInternal, ProjectScope)
      OUTPUT INSERTED.ProjectID
      VALUES
        (@MaDuAn, @ProjectCode, @ProjectName, @OtherName, @ClientID, @TypeID, @StatusID,
         @StageID, @LocationID, @StartDate, @PlannedEnd, @Year, @BudgetHours, @BudgetAmount,
         @Currency, @DienTich, @PmID, @BIMSoftware, @BIMTarget, @IsInternal, @Scope)
    `);

  const newId = result.recordset[0]['ProjectID'] as number;
  return getProjectById(newId);
}

// ============================================================
// UPDATE
// ============================================================
export async function updateProject(id: number, input: Partial<CreateProjectInput> & {
  actualEndDate?: string;
  isActive?: boolean;
  chuTriChinh?: number;
  chuTriKienTruc?: number;
  chuTriKetCau?: number;
  chuTriMEP?: number;
  bimManager?: number;
  problems?: string;
  solution?: string;
}): Promise<Project> {
  const pool = getDmcDb();

  await pool.request()
    .input('ID', sql.Int, id)
    .input('Name', sql.NVarChar(200), input.projectName ?? null)
    .input('OtherName', sql.NVarChar(200), input.projectOtherName ?? null)
    .input('ClientID', sql.Int, input.clientId ?? null)
    .input('TypeID', sql.Int, input.typeId ?? null)
    .input('StatusID', sql.Int, input.statusId ?? null)
    .input('StageID', sql.Int, input.stageId ?? null)
    .input('LocationID', sql.Int, input.locationId ?? null)
    .input('StartDate', sql.Date, input.startDate ?? null)
    .input('PlannedEnd', sql.Date, input.plannedEndDate ?? null)
    .input('ActualEnd', sql.Date, input.actualEndDate ?? null)
    .input('BudgetHours', sql.Decimal(10, 2), input.budgetHours ?? null)
    .input('BudgetAmount', sql.Decimal(14, 2), input.budgetAmount ?? null)
    .input('DienTich', sql.Decimal(12, 2), input.dienTich ?? null)
    .input('PmID', sql.Int, input.pmEmployeeId ?? null)
    .input('ChuTriChinh', sql.Int, input.chuTriChinh ?? null)
    .input('ChuTriKienTruc', sql.Int, input.chuTriKienTruc ?? null)
    .input('ChuTriKetCau', sql.Int, input.chuTriKetCau ?? null)
    .input('ChuTriMEP', sql.Int, input.chuTriMEP ?? null)
    .input('BIMManager', sql.Int, input.bimManager ?? null)
    .input('BIMSoftware', sql.NVarChar(100), input.bimSoftware ?? null)
    .input('BIMTarget', sql.NVarChar(500), input.bimTarget ?? null)
    .input('Active', sql.Bit, input.isActive != null ? (input.isActive ? 1 : 0) : null)
    .input('Problems', sql.NVarChar(sql.MAX), input.problems ?? null)
    .input('Solution', sql.NVarChar(sql.MAX), input.solution ?? null)
    .query(`
      UPDATE dmcDb_Schema.Projects SET
        ProjectName     = COALESCE(@Name, ProjectName),
        ProjectOtherName= COALESCE(@OtherName, ProjectOtherName),
        ClientID        = COALESCE(@ClientID, ClientID),
        TypeID          = COALESCE(@TypeID, TypeID),
        StatusID        = COALESCE(@StatusID, StatusID),
        StageID         = COALESCE(@StageID, StageID),
        LocationID      = COALESCE(@LocationID, LocationID),
        StartDate       = COALESCE(@StartDate, StartDate),
        PlannedEndDate  = COALESCE(@PlannedEnd, PlannedEndDate),
        ActualEndDate   = COALESCE(@ActualEnd, ActualEndDate),
        BudgetHours     = COALESCE(@BudgetHours, BudgetHours),
        BudgetAmount    = COALESCE(@BudgetAmount, BudgetAmount),
        DienTich        = COALESCE(@DienTich, DienTich),
        PMEmployeeID    = COALESCE(@PmID, PMEmployeeID),
        ChuTriChinh     = COALESCE(@ChuTriChinh, ChuTriChinh),
        ChuTriKienTruc  = COALESCE(@ChuTriKienTruc, ChuTriKienTruc),
        ChuTriKetCau    = COALESCE(@ChuTriKetCau, ChuTriKetCau),
        ChuTriMEP       = COALESCE(@ChuTriMEP, ChuTriMEP),
        BIMManager      = COALESCE(@BIMManager, BIMManager),
        BIMSoftware     = COALESCE(@BIMSoftware, BIMSoftware),
        BIMTarget       = COALESCE(@BIMTarget, BIMTarget),
        IsActive        = COALESCE(@Active, IsActive),
        Problems        = COALESCE(@Problems, Problems),
        Solution        = COALESCE(@Solution, Solution),
        UpdatedAt       = GETUTCDATE()
      WHERE ProjectID = @ID
    `);

  return getProjectById(id);
}

// ============================================================
// PROJECT HOURS SUMMARY (cross-db: task logs from BIMdb)
// ============================================================
export async function getProjectHoursSummary(projectId: number, weekStart?: string) {
  const bimPool = getBimDb();

  const dateFilter = weekStart
    ? `AND tl.WorkDate >= @WeekStart AND tl.WorkDate < DATEADD(DAY, 7, @WeekStart)`
    : '';

  const result = await bimPool.request()
    .input('ProjectID', sql.Int, projectId)
    .input('WeekStart', sql.Date, weekStart ?? null)
    .query(`
      SELECT
        tl.EmployeeID,
        SUM(tl.Hours) AS TotalHours,
        SUM(tl.OvertimeHours) AS TotalOT,
        COUNT(DISTINCT tl.WorkDate) AS WorkDays
      FROM BIMdb_Schema.TaskLogs tl
      WHERE tl.ProjectID = @ProjectID ${dateFilter}
      GROUP BY tl.EmployeeID
    `);

  const totalHours = result.recordset.reduce((s, r) => s + Number(r['TotalHours']), 0);
  const totalOT = result.recordset.reduce((s, r) => s + Number(r['TotalOT']), 0);
  const memberCount = result.recordset.length;

  return { projectId, totalHours, totalOT, memberCount, members: result.recordset };
}

// ============================================================
// LOOKUP DATA
// ============================================================
export async function getProjectStatuses() {
  const pool = getDmcDb();
  const r = await pool.request().query(
    `SELECT StatusID, StatusCode, StatusName, ColorCode, SortOrder
     FROM dmcDb_Schema.ProjectStatuses ORDER BY SortOrder`
  );
  return r.recordset;
}

export async function getProjectTypes() {
  const pool = getDmcDb();
  const r = await pool.request().query(
    `SELECT TypeID, TypeCode, TypeName, Description FROM dmcDb_Schema.ProjectTypes ORDER BY TypeName`
  );
  return r.recordset;
}

export async function getProjectStages() {
  const pool = getDmcDb();
  const r = await pool.request().query(
    `SELECT StageID, StageName, StageCode, SortOrder FROM dmcDb_Schema.ProjectStages ORDER BY SortOrder`
  );
  return r.recordset;
}

export async function getClients() {
  const pool = getDmcDb();
  const r = await pool.request().query(
    `SELECT ClientID, ClientCode, ClientName, ShortName, Industry, IsActive
     FROM dmcDb_Schema.Clients WHERE IsActive = 1 ORDER BY ClientName`
  );
  return r.recordset;
}

// ============================================================
// MAPPER
// ============================================================
function mapProject(row: Record<string, unknown>): Project {
  return {
    projectId: row['ProjectID'] as number,
    maDuAn: row['MaDuAn'] as string,
    projectCode: row['ProjectCode'] as string | null,
    projectName: row['ProjectName'] as string,
    projectOtherName: row['ProjectOtherName'] as string | null,
    clientId: row['ClientID'] as number | null,
    typeId: row['TypeID'] as number | null,
    statusId: row['StatusID'] as number,
    stageId: row['StageID'] as number | null,
    locationId: row['LocationID'] as number | null,
    startDate: row['StartDate'] ? (row['StartDate'] as Date).toISOString().slice(0, 10) : null,
    plannedEndDate: row['PlannedEndDate'] ? (row['PlannedEndDate'] as Date).toISOString().slice(0, 10) : null,
    actualEndDate: row['ActualEndDate'] ? (row['ActualEndDate'] as Date).toISOString().slice(0, 10) : null,
    year: row['Year'] as number | null,
    budgetHours: Number(row['BudgetHours'] ?? 0),
    budgetAmount: row['BudgetAmount'] != null ? Number(row['BudgetAmount']) : null,
    currencyCode: (row['CurrencyCode'] as string) ?? 'VND',
    dienTich: row['DienTich'] != null ? Number(row['DienTich']) : null,
    pmEmployeeId: row['PMEmployeeID'] as number | null,
    chuTriChinh: row['ChuTriChinh'] as number | null,
    chuTriKienTruc: row['ChuTriKienTruc'] as number | null,
    chuTriKetCau: row['ChuTriKetCau'] as number | null,
    chuTriMEP: row['ChuTriMEP'] as number | null,
    bimManager: row['BIMManager'] as number | null,
    bimSoftware: row['BIMSoftware'] as string | null,
    isInternal: Boolean(row['IsInternal']),
    isActive: Boolean(row['IsActive']),
    image: row['Image'] as string | null,
    createdAt: (row['CreatedAt'] as Date).toISOString(),
    updatedAt: (row['UpdatedAt'] as Date).toISOString(),
    // Joined fields
    clientName: row['ClientName'] as string | null,
    clientShortName: row['ClientShortName'] as string | null,
    statusName: row['StatusName'] as string | null,
    statusColor: row['StatusColor'] as string | null,
    typeName: row['TypeName'] as string | null,
    stageName: row['StageName'] as string | null,
    locationName: row['LocationName'] as string | null,
    phases: [],
  };
}
