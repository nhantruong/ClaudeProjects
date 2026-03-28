import { apiClient } from './client';
import type { Employee, Department, Discipline, Position } from '@bim/shared-types';

export interface EmployeeFilters {
  departmentId?: number;
  disciplineId?: number;
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

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

export const employeesApi = {
  // Lookup
  getDepartments: async (): Promise<Department[]> => {
    const { data } = await apiClient.get('/employees/lookup/departments');
    return data.data;
  },

  getDisciplines: async (): Promise<Discipline[]> => {
    const { data } = await apiClient.get('/employees/lookup/disciplines');
    return data.data;
  },

  getPositions: async (): Promise<Position[]> => {
    const { data } = await apiClient.get('/employees/lookup/positions');
    return data.data;
  },

  // Self
  getMe: async (): Promise<Employee> => {
    const { data } = await apiClient.get('/employees/me');
    return data.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.patch('/employees/me/password', { currentPassword, newPassword });
  },

  // List
  list: async (filters?: EmployeeFilters): Promise<{ data: Employee[]; total: number; page: number; pageSize: number }> => {
    const { data } = await apiClient.get('/employees', { params: filters });
    return data;
  },

  getById: async (id: number): Promise<Employee> => {
    const { data } = await apiClient.get(`/employees/${id}`);
    return data.data;
  },

  // Admin
  create: async (input: CreateEmployeeInput): Promise<Employee> => {
    const { data } = await apiClient.post('/employees', input);
    return data.data;
  },

  update: async (id: number, input: UpdateEmployeeInput): Promise<Employee> => {
    const { data } = await apiClient.patch(`/employees/${id}`, input);
    return data.data;
  },

  resetPassword: async (id: number, newPassword: string): Promise<void> => {
    await apiClient.post(`/employees/${id}/reset-password`, { newPassword });
  },
};
