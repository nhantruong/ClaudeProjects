import { get } from '@/lib/api';

export interface WorkType {
  id: number;
  name: string;
  groupId: number;
  groupName: string;
}

export const lookupApi = {
  getWorkTypes: () => get<{ workTypes: WorkType[] }>('/lookups/work-types'),
};
