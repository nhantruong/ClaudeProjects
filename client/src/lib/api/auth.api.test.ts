import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the api helpers before importing the module under test
vi.mock('@/lib/api', () => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

import { login, logout, getMe, changePassword } from './auth.api';
import { get, post, patch } from '@/lib/api';

const mockPost = vi.mocked(post);
const mockGet = vi.mocked(get);
const mockPatch = vi.mocked(patch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('auth.api', () => {
  describe('login', () => {
    it('calls POST /auth/login with credentials and returns user + token', async () => {
      const fakeData = {
        user: { id: 1, username: 'alice', displayName: 'Alice', role: 'admin' as const },
      };
      mockPost.mockResolvedValueOnce(fakeData);

      const result = await login('alice', 'secret');

      expect(mockPost).toHaveBeenCalledWith('/auth/login', {
        username: 'alice',
        password: 'secret',
      });
      expect(result.user.username).toBe('alice');
      // accessToken is always '' — JWT lives in the httpOnly cookie only (ADR-002)
      expect(result.accessToken).toBe('');
    });

    it('propagates errors thrown by the API client', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network error'));
      await expect(login('alice', 'wrong')).rejects.toThrow('Network error');
    });
  });

  describe('logout', () => {
    it('calls POST /auth/logout', async () => {
      mockPost.mockResolvedValueOnce({ data: null });
      await logout();
      expect(mockPost).toHaveBeenCalledWith('/auth/logout');
    });
  });

  describe('getMe', () => {
    it('calls GET /users/me and returns user data', async () => {
      const fakeData = {
        user: { id: 2, username: 'bob', displayName: 'Bob', role: 'member' as const },
      };
      mockGet.mockResolvedValueOnce(fakeData);

      const result = await getMe();

      expect(mockGet).toHaveBeenCalledWith('/users/me');
      expect(result.user.username).toBe('bob');
    });
  });

  describe('changePassword', () => {
    it('calls PATCH /auth/password with current and new passwords', async () => {
      mockPatch.mockResolvedValueOnce({ data: null });

      await changePassword('oldPass', 'newPass123');

      expect(mockPatch).toHaveBeenCalledWith('/auth/password', {
        currentPassword: 'oldPass',
        newPassword: 'newPass123',
      });
    });

    it('propagates errors thrown by the API client', async () => {
      mockPatch.mockRejectedValueOnce(new Error('Unauthorized'));
      await expect(changePassword('wrong', 'newPass123')).rejects.toThrow('Unauthorized');
    });
  });
});
