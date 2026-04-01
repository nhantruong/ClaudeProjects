/**
 * user.service.test.ts — Unit tests for the user management service.
 *
 * All external dependencies (user model, bcrypt) are mocked so these tests
 * run without a database or network connection.
 *
 * Test cases cover:
 *  listUsers:
 *    - success: delegates to model and returns array
 *
 *  createUser:
 *    - success: hashes password and persists user; returns SafeUser
 *    - duplicate username: throws 409 CONFLICT
 *
 *  updateUser:
 *    - success: delegates update to model; returns SafeUser
 *    - user not found: throws 404 NOT_FOUND
 *
 *  getUserById:
 *    - success: returns SafeUser without passwordHash
 *    - user not found: throws 404 NOT_FOUND
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the module under test
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

vi.mock('../models/user.model.js', () => ({
  findByUsername: vi.fn(),
  findById: vi.fn(),
  listUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

// Import mocks and module-under-test after vi.mock() calls
import bcrypt from 'bcryptjs';
import * as userModel from '../models/user.model.js';
import * as userService from './user.service.js';

// ---------------------------------------------------------------------------
// Typed mock helpers
// ---------------------------------------------------------------------------

const mockFindByUsername = vi.mocked(userModel.findByUsername);
const mockFindById = vi.mocked(userModel.findById);
const mockListUsers = vi.mocked(userModel.listUsers);
const mockCreateUser = vi.mocked(userModel.createUser);
const mockUpdateUser = vi.mocked(userModel.updateUser);
const mockBcryptHash = vi.mocked(bcrypt.hash);

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const safeUser = {
  id: 1,
  username: 'alice',
  displayName: 'Alice Smith',
  role: 'member' as const,
  isActive: true,
};

const fullUser = {
  ...safeUser,
  passwordHash: '$2a$12$hashedpassword',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// listUsers
// ---------------------------------------------------------------------------

describe('userService.listUsers', () => {
  it('returns an array of safe users from the model', async () => {
    mockListUsers.mockResolvedValue([safeUser]);

    const result = await userService.listUsers();

    expect(mockListUsers).toHaveBeenCalledOnce();
    expect(result).toEqual([safeUser]);
  });

  it('returns an empty array when no users exist', async () => {
    mockListUsers.mockResolvedValue([]);

    const result = await userService.listUsers();

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// createUser
// ---------------------------------------------------------------------------

describe('userService.createUser', () => {
  const createInput = {
    username: 'alice',
    displayName: 'Alice Smith',
    password: 'plaintext-password',
    role: 'member' as const,
  };

  it('hashes the password and persists the user; returns SafeUser', async () => {
    mockFindByUsername.mockResolvedValue(null);
    mockBcryptHash.mockResolvedValue('$2a$12$hashedpassword' as never);
    mockCreateUser.mockResolvedValue(safeUser);

    const result = await userService.createUser(createInput);

    expect(mockFindByUsername).toHaveBeenCalledWith('alice');
    expect(mockBcryptHash).toHaveBeenCalledWith('plaintext-password', 12);
    expect(mockCreateUser).toHaveBeenCalledWith({
      username: 'alice',
      passwordHash: '$2a$12$hashedpassword',
      displayName: 'Alice Smith',
      role: 'member',
    });
    expect(result).toEqual(safeUser);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('throws 409 CONFLICT when the username is already taken', async () => {
    mockFindByUsername.mockResolvedValue(fullUser);

    await expect(userService.createUser(createInput)).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Username is already taken',
    });

    expect(mockBcryptHash).not.toHaveBeenCalled();
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('throws an AppError instance on conflict', async () => {
    mockFindByUsername.mockResolvedValue(fullUser);

    const error = await userService.createUser(createInput).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
  });
});

// ---------------------------------------------------------------------------
// updateUser
// ---------------------------------------------------------------------------

describe('userService.updateUser', () => {
  it('delegates to the model and returns the updated SafeUser', async () => {
    mockFindById.mockResolvedValue(fullUser);
    const updatedUser = { ...safeUser, displayName: 'Alice Updated' };
    mockUpdateUser.mockResolvedValue(updatedUser);

    const result = await userService.updateUser(1, { displayName: 'Alice Updated' });

    expect(mockFindById).toHaveBeenCalledWith(1);
    expect(mockUpdateUser).toHaveBeenCalledWith(1, { displayName: 'Alice Updated' });
    expect(result).toEqual(updatedUser);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('throws 404 NOT_FOUND when no user with the given id exists', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(userService.updateUser(999, { displayName: 'Ghost' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'User not found',
    });

    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('can deactivate a user by setting isActive to false', async () => {
    mockFindById.mockResolvedValue(fullUser);
    const deactivated = { ...safeUser, isActive: false };
    mockUpdateUser.mockResolvedValue(deactivated);

    const result = await userService.updateUser(1, { isActive: false });

    expect(mockUpdateUser).toHaveBeenCalledWith(1, { isActive: false });
    expect(result.isActive).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getUserById
// ---------------------------------------------------------------------------

describe('userService.getUserById', () => {
  it('returns the safe user without passwordHash', async () => {
    mockFindById.mockResolvedValue(fullUser);

    const result = await userService.getUserById(1);

    expect(result).toMatchObject({
      id: 1,
      username: 'alice',
      displayName: 'Alice Smith',
      role: 'member',
      isActive: true,
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('throws 404 NOT_FOUND when the user does not exist', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(userService.getUserById(999)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'User not found',
    });
  });

  it('throws an AppError instance when user is not found', async () => {
    mockFindById.mockResolvedValue(null);

    const error = await userService.getUserById(999).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
  });
});
