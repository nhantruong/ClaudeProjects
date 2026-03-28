import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/auth.store';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// Attach Bearer token to every request
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let refreshPromise: Promise<void> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const refreshToken = useAuthStore.getState().refreshToken;
            if (!refreshToken) throw new Error('No refresh token');

            const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken });
            useAuthStore.getState().setTokens(
              data.data.tokens.accessToken,
              data.data.tokens.refreshToken
            );
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
