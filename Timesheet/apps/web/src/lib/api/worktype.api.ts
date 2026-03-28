import { apiClient } from './client';
import type { WorkGroup, WorkType, WorkDetailAction } from '@bim/shared-types';

export const worktypeApi = {
  // Full nested hierarchy for form dropdowns
  getHierarchy: async (): Promise<WorkGroup[]> => {
    const { data } = await apiClient.get('/worktypes/hierarchy');
    return data.data;
  },

  getGroups: async (activeOnly = true): Promise<WorkGroup[]> => {
    const { data } = await apiClient.get('/worktypes/groups', {
      params: activeOnly ? undefined : { active: 'false' },
    });
    return data.data;
  },

  getTypes: async (groupId?: number): Promise<WorkType[]> => {
    const { data } = await apiClient.get('/worktypes/types', {
      params: groupId ? { groupId } : {},
    });
    return data.data;
  },

  getActions: async (typeId?: number): Promise<WorkDetailAction[]> => {
    const { data } = await apiClient.get('/worktypes/actions', {
      params: typeId ? { typeId } : {},
    });
    return data.data;
  },
};
