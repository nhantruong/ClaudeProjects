import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ── Replicate the validation schema from AccountSettingsPage ───────────────

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

describe('AccountSettingsPage — change password validation schema', () => {
  it('passes when all fields are valid and passwords match', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldPass123',
      newPassword: 'newPass456',
      confirmPassword: 'newPass456',
    });
    expect(result.success).toBe(true);
  });

  it('fails when currentPassword is empty', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: '',
      newPassword: 'newPass456',
      confirmPassword: 'newPass456',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === 'currentPassword');
      expect(err?.message).toBe('Current password is required');
    }
  });

  it('fails when newPassword is fewer than 8 characters', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldPass123',
      newPassword: 'short',
      confirmPassword: 'short',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === 'newPassword');
      expect(err?.message).toBe('New password must be at least 8 characters');
    }
  });

  it('fails when passwords do not match', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldPass123',
      newPassword: 'newPass456',
      confirmPassword: 'different789',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === 'confirmPassword');
      expect(err?.message).toBe('Passwords do not match');
    }
  });

  it('fails when confirmPassword is empty', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldPass123',
      newPassword: 'newPass456',
      confirmPassword: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === 'confirmPassword');
      expect(err).toBeDefined();
    }
  });

  it('accepts a new password that is exactly 8 characters', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldPass123',
      newPassword: 'exactly8',
      confirmPassword: 'exactly8',
    });
    expect(result.success).toBe(true);
  });
});
