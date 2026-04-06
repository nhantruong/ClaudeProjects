/**
 * lookup.model.ts — Query functions for read-only reference/lookup tables.
 */

import { query } from '../lib/db.js';

export interface WorkType {
  id: number;
  name: string;
  groupId: number;
  groupName: string;
  isActive: boolean;
}

interface WorkTypeRow {
  id: number;
  name: string;
  group_id: number;
  group_name: string;
  is_active: boolean;
}

export async function getWorkTypes(): Promise<WorkType[]> {
  const rows = await query<WorkTypeRow>(
    `SELECT wt.id, wt.name, wt.group_id, g.name AS group_name, wt.is_active
     FROM ref_work_types wt
     INNER JOIN ref_work_type_groups g ON g.id = wt.group_id
     WHERE wt.is_active = 1
     ORDER BY g.sort_order ASC, wt.name ASC`,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    groupId: r.group_id,
    groupName: r.group_name,
    isActive: r.is_active,
  }));
}
