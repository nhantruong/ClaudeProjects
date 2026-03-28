import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { AuthUser, RoleCode } from '@bim/shared-types';

export interface AuthRequest extends Request {
  user?: AuthUser;
}

interface JwtPayload {
  sub: number;        // employeeId
  code: string;       // employeeCode
  email: string;
  role: RoleCode;
  level: number;      // hierarchyLevel
  dept: number;       // departmentId
  firstName: string;
  lastName: string;
  avatar: string | null;
  iat?: number;
  exp?: number;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No token provided' } });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = {
      employeeId: payload.sub,
      employeeCode: payload.code,
      email: payload.email,
      roleCode: payload.role,
      hierarchyLevel: payload.level,
      departmentId: payload.dept,
      firstName: payload.firstName,
      lastName: payload.lastName,
      avatarUrl: payload.avatar,
    };
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: { code: 'TOKEN_INVALID', message: 'Invalid or expired token' } });
  }
}

// Role guard factory — minimum hierarchy level required
export function requireLevel(minLevel: number) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.hierarchyLevel < minLevel) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
      return;
    }
    next();
  };
}

// Convenience guards
export const requireAdmin = requireLevel(4);
export const requirePM = requireLevel(3);
export const requireTeamLead = requireLevel(2);

export function signAccessToken(user: AuthUser): string {
  const payload: JwtPayload = {
    sub: user.employeeId,
    code: user.employeeCode,
    email: user.email,
    role: user.roleCode,
    level: user.hierarchyLevel,
    dept: user.departmentId,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatarUrl,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN as any });
}

export function signRefreshToken(employeeId: number): string {
  return jwt.sign({ sub: employeeId }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any });
}

export function verifyRefreshToken(token: string): { sub: number } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: number };
}
