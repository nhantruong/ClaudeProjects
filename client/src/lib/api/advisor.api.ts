import { get, post } from '@/lib/api';

export type PriorityLevel = 'critical' | 'high' | 'normal';
export type AlertType = 'overdue' | 'blocked' | 'due_today';

export interface PriorityItem {
  rank: number;
  level: PriorityLevel;
  summary: string;
  detail: string;
  taskTitle?: string;
  projectName?: string;
}

export interface AlertItem {
  type: AlertType;
  message: string;
}

export interface BriefingResponse {
  generatedAt: string;
  priorities: PriorityItem[];
  alerts: AlertItem[];
  recommendations: string[];
}

export const advisorApi = {
  getBriefing: () => get<BriefingResponse>('/advisor/briefing'),
  ask: (question: string) => post<{ answer: string }>('/advisor/ask', { question }),
};
