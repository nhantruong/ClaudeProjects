import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/lib/stores/auth';

// ── Axios instance ────────────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
  withCredentials: true,
});

// ── Request interceptor — attach Bearer token ─────────────────────────────────

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — auto-refresh on 401 ───────────────────────────────

let refreshPromise: Promise<void> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      // Deduplicate concurrent refresh attempts into a single request
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const { data } = await axios.post(
              `${import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1'}/auth/refresh`,
              {},
              { withCredentials: true }
            );
            useAuthStore.getState().setToken(data.data.accessToken as string);
          } catch {
            useAuthStore.getState().logout();
            window.location.href = '/login';
          } finally {
            refreshPromise = null;
          }
        })();
      }

      await refreshPromise;

      const newToken = useAuthStore.getState().accessToken;
      if (newToken && original.headers) {
        original.headers['Authorization'] = `Bearer ${newToken}`;
      }
      return apiClient(original);
    }

    return Promise.reject(error);
  }
);

// ── Typed helpers ─────────────────────────────────────────────────────────────

export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const response = await apiClient.get<T>(url, { params });
  return response.data;
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
  const response = await apiClient.post<T>(url, body);
  return response.data;
}

export async function patch<T>(url: string, body?: unknown): Promise<T> {
  const response = await apiClient.patch<T>(url, body);
  return response.data;
}

export async function del<T>(url: string): Promise<T> {
  const response = await apiClient.delete<T>(url);
  return response.data;
}
