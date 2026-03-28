/**
 * user.model.ts — Raw SQL query functions for the users table.
 *
 * This module is the only place that talks to the users table.
 * No business logic lives here — only parameterised SQL queries.
 *
 * SECURITY: All inputs are passed via named parameters — never string-concatenated.
 */

import { query, sql } from '../lib/db.js';

// ---------------------------------------------------------------------------
// Domain type
// ---------------------------------------------------------------------------

export interface User {
  id: number;
  username: string;
  passwordHash: string;
  displayName: string;
  role: 'admin' | 'manager' | 'member';
  isActive: boolean;
}

/** User shape safe to return in API responses — password hash excluded. */
export type SafeUser = Omit<User, 'passwordHash'>;

// ---------------------------------------------------------------------------
// DB row shape (snake_case from SQL Server)
// ---------------------------------------------------------------------------

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  display_name: string;
  role: 'admin' | 'manager' | 'member';
  is_active: boolean;
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    displayName: row.display_name,
    role: row.role,
    isActive: row.is_active,
  };
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/**
 * findByUsername — look up an active user by login identifier.
 * Used by the auth service during login.
 *
 * Returns null when no matching active user exists.
 */
export async function findByUsername(username: string): Promise<User | null> {
  const rows = await query<UserRow>(
    `SELECT id, username, password_hash, display_name, role, is_active
     FROM users
     WHERE username = @username
       AND is_active = 1`,
    { username: { type: sql.NVarChar(100), value: username } },
  );

  return rows.length > 0 ? rowToUser(rows[0]) : null;
}

/**
 * findById — look up any user (active or inactive) by primary key.
 * Used by the auth service to retrieve the authenticated user's profile.
 *
 * Returns null when no user with the given id exists.
 */
export async function findById(id: number): Promise<User | null> {
  const rows = await query<UserRow>(
    `SELECT id, username, password_hash, display_name, role, is_active
     FROM users
     WHERE id = @id`,
    { id: { type: sql.Int, value: id } },
  );

  return rows.length > 0 ? rowToUser(rows[0]) : null;
}

/**
 * updatePassword — replace the bcrypt hash for a user.
 * The caller is responsible for generating the new hash.
 * Also bumps updated_at to the current UTC time.
 */
export async function updatePassword(id: number, passwordHash: string): Promise<void> {
  await query(
    `UPDATE users
     SET password_hash = @passwordHash,
         updated_at    = GETUTCDATE()
     WHERE id = @id`,
    {
      id: { type: sql.Int, value: id },
      passwordHash: { type: sql.NVarChar(255), value: passwordHash },
    },
  );
}
