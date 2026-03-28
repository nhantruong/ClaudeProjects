import { getBimDb, sql } from '../../config/database.js';
import type { WorkGroup, WorkType, WorkDetailAction } from '@bim/shared-types';

// ============================================================
// WORK GROUPS (C19_Workgroup)
// ============================================================
export async function getWorkGroups(activeOnly = true): Promise<WorkGroup[]> {
  const pool = getBimDb();
  const result = await pool
    .request()
    .input('Active', sql.Bit, activeOnly ? 1 : null)
    .query(`
      SELECT WorkGroupID, GroupCode, GroupName, IsProjectRelated, IsActive, SortOrder, CreatedAt
      FROM BIMdb_Schema.WorkGroups
      WHERE (@Active IS NULL OR IsActive = @Active)
      ORDER BY SortOrder, GroupName
    `);
  return result.recordset.map(mapWorkGroup);
}

export async function getWorkGroupById(id: number): Promise<WorkGroup> {
  const pool = getBimDb();
  const result = await pool
    .request()
    .input('ID', sql.Int, id)
    .query(`
      SELECT w.*, wt.WorkTypeID, wt.TypeCode, wt.TypeName, wt.IsActive AS TypeIsActive, wt.SortOrder AS TypeSortOrder
      FROM BIMdb_Schema.WorkGroups w
      LEFT JOIN BIMdb_Schema.WorkTypes wt ON wt.WorkGroupID = w.WorkGroupID AND wt.IsActive = 1
      WHERE w.WorkGroupID = @ID
      ORDER BY wt.SortOrder, wt.TypeName
    `);

  if (!result.recordset.length) throw new Error('Work group not found');
  const first = result.recordset[0];
  const group = mapWorkGroup(first);
  group.workTypes = result.recordset
    .filter(r => r['WorkTypeID'])
    .map(r => ({
      workTypeId: r['WorkTypeID'] as number,
      workGroupId: id,
      typeCode: r['TypeCode'] as string,
      typeName: r['TypeName'] as string,
      isActive: Boolean(r['TypeIsActive']),
      sortOrder: (r['TypeSortOrder'] as number) ?? 0,
    }));
  return group;
}

// ============================================================
// WORK TYPES (C07_WorkType)
// ============================================================
export async function getWorkTypes(workGroupId?: number, activeOnly = true): Promise<WorkType[]> {
  const pool = getBimDb();
  const result = await pool
    .request()
    .input('GroupID', sql.Int, workGroupId ?? null)
    .input('Active', sql.Bit, activeOnly ? 1 : null)
    .query(`
      SELECT WorkTypeID, WorkGroupID, TypeCode, TypeName, IsActive, SortOrder
      FROM BIMdb_Schema.WorkTypes
      WHERE (@GroupID IS NULL OR WorkGroupID = @GroupID)
        AND (@Active IS NULL OR IsActive = @Active)
      ORDER BY WorkGroupID, SortOrder, TypeName
    `);
  return result.recordset.map(mapWorkType);
}

// ============================================================
// DETAIL ACTIONS (C21_DetailAction)
// ============================================================
export async function getDetailActions(workTypeId?: number, activeOnly = true): Promise<WorkDetailAction[]> {
  const pool = getBimDb();
  const result = await pool
    .request()
    .input('TypeID', sql.Int, workTypeId ?? null)
    .input('Active', sql.Bit, activeOnly ? 1 : null)
    .query(`
      SELECT DetailActionID, WorkTypeID, ActionCode, ActionName, DefaultHours, IsActive, SortOrder
      FROM BIMdb_Schema.WorkDetailActions
      WHERE (@TypeID IS NULL OR WorkTypeID = @TypeID)
        AND (@Active IS NULL OR IsActive = @Active)
      ORDER BY WorkTypeID, SortOrder, ActionName
    `);
  return result.recordset.map(mapDetailAction);
}

// ============================================================
// FULL HIERARCHY (for frontend to build the form selectors)
// ============================================================
export async function getFullHierarchy(): Promise<WorkGroup[]> {
  const pool = getBimDb();

  const [groupsRes, typesRes, actionsRes] = await Promise.all([
    pool.request().query(`
      SELECT WorkGroupID, GroupCode, GroupName, IsProjectRelated, IsActive, SortOrder
      FROM BIMdb_Schema.WorkGroups WHERE IsActive = 1 ORDER BY SortOrder, GroupName
    `),
    pool.request().query(`
      SELECT WorkTypeID, WorkGroupID, TypeCode, TypeName, IsActive, SortOrder
      FROM BIMdb_Schema.WorkTypes WHERE IsActive = 1 ORDER BY WorkGroupID, SortOrder, TypeName
    `),
    pool.request().query(`
      SELECT DetailActionID, WorkTypeID, ActionCode, ActionName, DefaultHours, IsActive, SortOrder
      FROM BIMdb_Schema.WorkDetailActions WHERE IsActive = 1 ORDER BY WorkTypeID, SortOrder, ActionName
    `),
  ]);

  // Map actions by workTypeId
  const actionsByType = new Map<number, WorkDetailAction[]>();
  for (const row of actionsRes.recordset) {
    const tid = row['WorkTypeID'] as number;
    if (!actionsByType.has(tid)) actionsByType.set(tid, []);
    actionsByType.get(tid)!.push(mapDetailAction(row));
  }

  // Map types by workGroupId (with actions)
  const typesByGroup = new Map<number, WorkType[]>();
  for (const row of typesRes.recordset) {
    const gid = row['WorkGroupID'] as number;
    if (!typesByGroup.has(gid)) typesByGroup.set(gid, []);
    const wt = mapWorkType(row);
    wt.detailActions = actionsByType.get(wt.workTypeId) ?? [];
    typesByGroup.get(gid)!.push(wt);
  }

  // Build groups with nested types
  return groupsRes.recordset.map(row => {
    const g = mapWorkGroup(row);
    g.workTypes = typesByGroup.get(g.workGroupId) ?? [];
    return g;
  });
}

// ============================================================
// MAPPERS
// ============================================================
function mapWorkGroup(row: Record<string, unknown>): WorkGroup {
  return {
    workGroupId: row['WorkGroupID'] as number,
    groupCode: row['GroupCode'] as string,
    groupName: row['GroupName'] as string,
    isProjectRelated: Boolean(row['IsProjectRelated']),
    isActive: Boolean(row['IsActive']),
    sortOrder: (row['SortOrder'] as number) ?? 0,
    workTypes: [],
  };
}

function mapWorkType(row: Record<string, unknown>): WorkType {
  return {
    workTypeId: row['WorkTypeID'] as number,
    workGroupId: row['WorkGroupID'] as number,
    typeCode: row['TypeCode'] as string,
    typeName: row['TypeName'] as string,
    isActive: Boolean(row['IsActive']),
    sortOrder: (row['SortOrder'] as number) ?? 0,
    detailActions: [],
  };
}

function mapDetailAction(row: Record<string, unknown>): WorkDetailAction {
  return {
    detailActionId: row['DetailActionID'] as number,
    workTypeId: row['WorkTypeID'] as number,
    actionCode: row['ActionCode'] as string,
    actionName: row['ActionName'] as string,
    defaultHours: row['DefaultHours'] != null ? Number(row['DefaultHours']) : null,
    isActive: Boolean(row['IsActive']),
    sortOrder: (row['SortOrder'] as number) ?? 0,
  };
}
