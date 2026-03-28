import bcrypt from 'bcryptjs';
import { getBimDb, sql } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../middleware/auth.js';
import type { AuthUser, AuthTokens, LoginInput } from '@bim/shared-types';

interface EmployeeAuthRow {
  EmployeeID: number;
  EmployeeCode: string;
  FirstName: string;
  LastName: string;
  Email: string;
  DepartmentID: number;
  AvatarURL: string | null;
  RoleCode: string;
  HierarchyLevel: number;
  PasswordHash: string;
  FailedAttempts: number;
  LockedUntil: Date | null;
  IsActive: boolean;
}

export async function login(input: LoginInput): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  const pool = getBimDb();
  const result = await pool
    .request()
    .input('Email', sql.NVarChar(150), input.email.toLowerCase().trim())
    .query<EmployeeAuthRow>(`
      SELECT
        e.EmployeeID, e.EmployeeCode, e.FirstName, e.LastName, e.Email,
        e.DepartmentID, e.AvatarURL, e.IsActive,
        r.RoleCode, r.HierarchyLevel,
        a.PasswordHash, a.FailedAttempts, a.LockedUntil
      FROM BIMdb_Schema.Employees e
      JOIN BIMdb_Schema.Roles r ON e.RoleID = r.RoleID
      JOIN BIMdb_Schema.EmployeeAuth a ON e.EmployeeID = a.EmployeeID
      WHERE e.Email = @Email
    `);

  const row = result.recordset[0];
  if (!row) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');
  if (!row.IsActive) throw new AppError(401, 'ACCOUNT_INACTIVE', 'Tài khoản đã bị vô hiệu hóa');

  if (row.LockedUntil && row.LockedUntil > new Date()) {
    throw new AppError(423, 'ACCOUNT_LOCKED', `Tài khoản bị khóa đến ${row.LockedUntil.toISOString()}`);
  }

  const isValid = await bcrypt.compare(input.password, row.PasswordHash);
  if (!isValid) {
    await pool
      .request()
      .input('EmpID', sql.Int, row.EmployeeID)
      .query(`
        UPDATE BIMdb_Schema.EmployeeAuth
        SET FailedAttempts = FailedAttempts + 1,
            LockedUntil = CASE WHEN FailedAttempts + 1 >= 5 THEN DATEADD(MINUTE, 30, GETUTCDATE()) ELSE NULL END
        WHERE EmployeeID = @EmpID
      `);
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');
  }

  const user: AuthUser = {
    employeeId: row.EmployeeID,
    employeeCode: row.EmployeeCode,
    firstName: row.FirstName,
    lastName: row.LastName,
    email: row.Email,
    roleCode: row.RoleCode as AuthUser['roleCode'],
    hierarchyLevel: row.HierarchyLevel,
    departmentId: row.DepartmentID,
    avatarUrl: row.AvatarURL,
  };

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user.employeeId);
  const refreshHash = await bcrypt.hash(refreshToken, 8);

  await pool
    .request()
    .input('EmpID', sql.Int, user.employeeId)
    .input('Hash', sql.NVarChar(256), refreshHash)
    .query(`
      UPDATE BIMdb_Schema.EmployeeAuth
      SET FailedAttempts = 0, LockedUntil = NULL,
          LastLoginAt = GETUTCDATE(), RefreshTokenHash = @Hash
      WHERE EmployeeID = @EmpID
    `);

  return {
    user,
    tokens: { accessToken, refreshToken, expiresIn: 900 },
  };
}

export async function refreshTokens(token: string): Promise<AuthTokens> {
  let payload: { sub: number };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError(401, 'TOKEN_INVALID', 'Invalid refresh token');
  }

  const pool = getBimDb();
  const result = await pool
    .request()
    .input('EmpID', sql.Int, payload.sub)
    .query<EmployeeAuthRow>(`
      SELECT e.EmployeeID, e.EmployeeCode, e.FirstName, e.LastName, e.Email,
             e.DepartmentID, e.AvatarURL, e.IsActive,
             r.RoleCode, r.HierarchyLevel, a.RefreshTokenHash
      FROM BIMdb_Schema.Employees e
      JOIN BIMdb_Schema.Roles r ON e.RoleID = r.RoleID
      JOIN BIMdb_Schema.EmployeeAuth a ON e.EmployeeID = a.EmployeeID
      WHERE e.EmployeeID = @EmpID AND e.IsActive = 1
    `);

  const row = result.recordset[0];
  if (!row) throw new AppError(401, 'TOKEN_INVALID', 'User not found');

  const isMatch = await bcrypt.compare(token, row.RefreshTokenHash ?? '');
  if (!isMatch) throw new AppError(401, 'TOKEN_INVALID', 'Refresh token mismatch');

  const user: AuthUser = {
    employeeId: row.EmployeeID,
    employeeCode: row.EmployeeCode,
    firstName: row.FirstName,
    lastName: row.LastName,
    email: row.Email,
    roleCode: row.RoleCode as AuthUser['roleCode'],
    hierarchyLevel: row.HierarchyLevel,
    departmentId: row.DepartmentID,
    avatarUrl: row.AvatarURL,
  };

  const newAccess = signAccessToken(user);
  const newRefresh = signRefreshToken(user.employeeId);
  const newHash = await bcrypt.hash(newRefresh, 8);

  await pool
    .request()
    .input('EmpID', sql.Int, user.employeeId)
    .input('Hash', sql.NVarChar(256), newHash)
    .query(`UPDATE BIMdb_Schema.EmployeeAuth SET RefreshTokenHash = @Hash WHERE EmployeeID = @EmpID`);

  return { accessToken: newAccess, refreshToken: newRefresh, expiresIn: 900 };
}

export async function logout(employeeId: number): Promise<void> {
  const pool = getBimDb();
  await pool
    .request()
    .input('EmpID', sql.Int, employeeId)
    .query(`UPDATE BIMdb_Schema.EmployeeAuth SET RefreshTokenHash = NULL WHERE EmployeeID = @EmpID`);
}
