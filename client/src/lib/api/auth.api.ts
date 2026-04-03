import { get, post, patch } from '@/lib/api';
import type { ApiResponse, AuthUser } from '@/types';

// ── Auth API functions ─────────────────────────────────────────────────────

/**
 * Authenticate with username and password.
 * The server sets an httpOnly cookie containing the JWT (ADR-002).
 * The token is NOT returned in the response body — auth is cookie-only.
 */
export async function login(
  username: string,
  password: string
): Promise<{ user: AuthUser; accessToken: string }> {
  const data = await post<{ user: AuthUser }>('/auth/login', { username, password });
  // accessToken is empty — the JWT lives in the httpOnly cookie only.
  // Axios sends the cookie automatically via withCredentials: true.
  return { user: data.user, accessToken: '' };
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
  return get<{ user: AuthUser }>('/users/me');
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
