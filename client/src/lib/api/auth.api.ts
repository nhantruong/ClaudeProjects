import { get, post, patch } from '@/lib/api';
import type { ApiResponse, AuthUser } from '@/types';

// ── Auth API functions ─────────────────────────────────────────────────────

/**
 * Authenticate with username and password.
 * The server sets an httpOnly cookie containing the JWT and also returns
 * the accessToken in the response body (used by the Axios interceptor).
 */
export async function login(
  username: string,
  password: string
): Promise<{ user: AuthUser; accessToken: string }> {
  const response = await post<ApiResponse<{ user: AuthUser; accessToken: string }>>('/auth/login', {
    username,
    password,
  });
  return response.data;
}

/**
 * Invalidate the current session. The server clears the httpOnly cookie.
 * Fire-and-forget on the client — clear local state regardless of result.
 */
export async function logout(): Promise<void> {
  await post<ApiResponse<null>>('/auth/logout');
}

/**
 * Fetch the currently authenticated user's profile.
 * Used to restore auth state on page reload.
 */
export async function getMe(): Promise<{ user: AuthUser }> {
  const response = await get<ApiResponse<{ user: AuthUser }>>('/users/me');
  return response.data;
}

/**
 * Change the authenticated user's password.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await patch<ApiResponse<null>>('/auth/password', {
    currentPassword,
    newPassword,
  });
}
