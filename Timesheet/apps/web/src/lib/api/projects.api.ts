import { apiClient } from './client';
import type { Project, ProjectStatus, ProjectType, ProjectStage, Client } from '@bim/shared-types';

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

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  actualEndDate?: string;
  isActive?: boolean;
  chuTriChinh?: number;
  chuTriKienTruc?: number;
  chuTriKetCau?: number;
  chuTriMEP?: number;
  bimManager?: number;
  problems?: string;
  solution?: string;
}

export const projectsApi = {
  // Lookup
  getStatuses: async (): Promise<ProjectStatus[]> => {
    const { data } = await apiClient.get('/projects/lookup/statuses');
    return data.data;
  },

  getTypes: async (): Promise<ProjectType[]> => {
    const { data } = await apiClient.get('/projects/lookup/types');
    return data.data;
  },

  getStages: async (): Promise<ProjectStage[]> => {
    const { data } = await apiClient.get('/projects/lookup/stages');
    return data.data;
  },

  getClients: async (): Promise<Client[]> => {
    const { data } = await apiClient.get('/projects/lookup/clients');
    return data.data;
  },

  // CRUD
  list: async (filters?: ProjectFilters): Promise<{ data: Project[]; total: number; page: number; pageSize: number }> => {
    const { data } = await apiClient.get('/projects', { params: filters });
    return data;
  },

  getById: async (id: number): Promise<Project> => {
    const { data } = await apiClient.get(`/projects/${id}`);
    return data.data;
  },

  getHours: async (id: number, weekStart?: string): Promise<{
    projectId: number;
    totalHours: number;
    totalOT: number;
    memberCount: number;
  }> => {
    const { data } = await apiClient.get(`/projects/${id}/hours`, {
      params: weekStart ? { weekStart } : {},
    });
    return data.data;
  },

  create: async (input: CreateProjectInput): Promise<Project> => {
    const { data } = await apiClient.post('/projects', input);
    return data.data;
  },

  update: async (id: number, input: UpdateProjectInput): Promise<Project> => {
    const { data } = await apiClient.patch(`/projects/${id}`, input);
    return data.data;
  },

  archive: async (id: number): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },
};
