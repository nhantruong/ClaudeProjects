import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { login, refreshTokens, logout } from './auth.service.js';
import { authenticate, type AuthRequest } from '../../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = loginSchema.parse(req.body);
    const { user, tokens } = await login(input);
    res.json({ success: true, data: { user, tokens } });
  } catch (err) {
    next(err);
  }
});

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokens = await refreshTokens(refreshToken);
    res.json({ success: true, data: { tokens } });
  } catch (err) {
    next(err);
  }
});

// POST /auth/logout (requires auth)
router.post('/logout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await logout(req.user!.employeeId);
    res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me
router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: req.user });
});

export default router;
