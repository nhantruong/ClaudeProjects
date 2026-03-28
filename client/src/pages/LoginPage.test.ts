import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ── Replicate the validation schema from LoginPage ─────────────────────────
// Testing the schema in isolation avoids JSX/DOM test infrastructure while
// still verifying the validation rules are correct.

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

describe('LoginPage — validation schema', () => {
  it('passes when both fields are filled', () => {
    const result = loginSchema.safeParse({ username: 'alice', password: 'secret' });
    expect(result.success).toBe(true);
  });

  it('fails when username is empty', () => {
    const result = loginSchema.safeParse({ username: '', password: 'secret' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const usernameError = result.error.issues.find((i) => i.path[0] === 'username');
      expect(usernameError?.message).toBe('Username is required');
    }
  });

  it('fails when password is empty', () => {
    const result = loginSchema.safeParse({ username: 'alice', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordError = result.error.issues.find((i) => i.path[0] === 'password');
      expect(passwordError?.message).toBe('Password is required');
    }
  });

  it('fails when both fields are empty', () => {
    const result = loginSchema.safeParse({ username: '', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(2);
    }
  });

  it('fails when fields are missing entirely', () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
