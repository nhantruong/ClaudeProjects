/**
 * auth.service.test.ts — Unit tests for the auth service business logic.
 *
 * All external dependencies (user model, bcrypt, signToken) are mocked so
 * these tests run without a database or network connection.
 *
 * Test cases cover:
 *  login:
 *    - success: valid credentials → returns token + safe user (no passwordHash)
 *    - wrong password → 401 with generic message
 *    - user not found → 401 with identical generic message (no enumeration)
 *    - inactive user → 401 (findByUsername returns null for inactive)
 *
 *  changePassword:
 *    - success: correct current password → updatePassword called
 *    - wrong current password → 401
 *    - user not found → 404
 *
 *  getMe:
 *    - success → returns safe user (no passwordHash)
 *    - user not found → 404
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// Mocks — must be set up before importing the module under test
// ---------------------------------------------------------------------------

vi.mock('../lib/env.js', () => ({
  env: {
    SESSION_SECRET: 'test-secret-that-is-at-least-32-characters-long',
    NODE_ENV: 'test',
  },
}));

vi.mock('../lib/logger.js', () => ({
  default: { info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Mock the user model
vi.mock('../models/user.model.js', () => ({
  findByUsername: vi.fn(),
  findById: vi.fn(),
  updatePassword: vi.fn(),
}));

// Mock bcrypt — control what compare/hash return in each test
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

// Mock signToken — we only care that it is called with the right payload
vi.mock('../middleware/auth.js', () => ({
  signToken: vi.fn(() => 'signed.jwt.token'),
}));

// Import mocks and module-under-test after vi.mock() calls
import bcrypt from 'bcryptjs';
import * as userModel from '../models/user.model.js';
import { signToken } from '../middleware/auth.js';
import * as authService from './auth.service.js';

// ---------------------------------------------------------------------------
// Typed mock helpers
// ---------------------------------------------------------------------------

const mockFindByUsername = vi.mocked(userModel.findByUsername);
const mockFindById = vi.mocked(userModel.findById);
const mockUpdatePassword = vi.mocked(userModel.updatePassword);
const mockBcryptCompare = vi.mocked(bcrypt.compare);
const mockBcryptHash = vi.mocked(bcrypt.hash);
const mockSignToken = vi.mocked(signToken);

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const activeUser = {
  id: 1,
  username: 'alice',
  passwordHash: '$2a$12$hashedpassword',
  displayName: 'Alice Smith',
  role: 'member' as const,
  isActive: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------

describe('authService.login', () => {
  it('returns a token and safe user on valid credentials', async () => {
    mockFindByUsername.mockResolvedValue(activeUser);
    // bcrypt.compare returns boolean, but vi.mocked types it broadly
    mockBcryptCompare.mockResolvedValue(true as never);
    mockSignToken.mockReturnValue('signed.jwt.token');

    const result = await authService.login('alice', 'correct-password');

    expect(result.token).toBe('signed.jwt.token');
    expect(result.user).toMatchObject({
      id: 1,
      username: 'alice',
      displayName: 'Alice Smith',
      role: 'member',
    });

    // Password hash must never appear in the returned user
    expect(result.user).not.toHaveProperty('passwordHash');

    expect(mockSignToken).toHaveBeenCalledWith({ userId: 1, role: 'member' });
  });

  it('throws 401 with a generic message when the password is wrong', async () => {
    mockFindByUsername.mockResolvedValue(activeUser);
    mockBcryptCompare.mockResolvedValue(false as never);

    await expect(authService.login('alice', 'wrong-password')).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message: 'Invalid username or password',
    });
  });

  it('throws 401 with the SAME generic message when the user does not exist', async () => {
    mockFindByUsername.mockResolvedValue(null);

    await expect(authService.login('nobody', 'any-password')).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message: 'Invalid username or password',
    });

    // bcrypt must NOT be called — we short-circuited before it
    expect(mockBcryptCompare).not.toHaveBeenCalled();
  });

  it('throws 401 for an inactive user (findByUsername returns null for inactive)', async () => {
    // findByUsername filters WHERE is_active = 1, so it returns null for inactive users
    mockFindByUsername.mockResolvedValue(null);

    await expect(authService.login('inactive', 'password')).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid username or password',
    });
  });

  it('throws an AppError instance on login failure', async () => {
    mockFindByUsername.mockResolvedValue(null);

    const error = await authService.login('x', 'y').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
  });
});

// ---------------------------------------------------------------------------
// changePassword
// ---------------------------------------------------------------------------

describe('authService.changePassword', () => {
  it('hashes and saves the new password when the current password is correct', async () => {
    mockFindById.mockResolvedValue(activeUser);
    mockBcryptCompare.mockResolvedValue(true as never);
    mockBcryptHash.mockResolvedValue('$2a$12$newhashedpassword' as never);
    mockUpdatePassword.mockResolvedValue(undefined);

    await authService.changePassword(1, 'current-pass', 'new-password-123');

    expect(mockBcryptHash).toHaveBeenCalledWith('new-password-123', 12);
    expect(mockUpdatePassword).toHaveBeenCalledWith(1, '$2a$12$newhashedpassword');
  });

  it('throws 401 when the current password is wrong', async () => {
    mockFindById.mockResolvedValue(activeUser);
    mockBcryptCompare.mockResolvedValue(false as never);

    await expect(
      authService.changePassword(1, 'wrong-current', 'new-password-123'),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHENTICATED',
    });

    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('throws 404 when the user does not exist', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      authService.changePassword(999, 'any', 'new-password-123'),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    expect(mockBcryptCompare).not.toHaveBeenCalled();
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getMe
// ---------------------------------------------------------------------------

describe('authService.getMe', () => {
  it('returns the safe user without passwordHash', async () => {
    mockFindById.mockResolvedValue(activeUser);

    const result = await authService.getMe(1);

    expect(result).toMatchObject({
      id: 1,
      username: 'alice',
      displayName: 'Alice Smith',
      role: 'member',
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('throws 404 when the user does not exist', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(authService.getMe(999)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });
});
