import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword, signToken, verifyToken } from '@/lib/auth';

describe('Auth Security Unit Tests', () => {
  it('should hash password and verify match correctly', async () => {
    const rawPassword = 'mySuperSecretPassword2026';
    const hash = await hashPassword(rawPassword);

    expect(hash).not.toBe(rawPassword);

    const isMatch = await comparePassword(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isWrong = await comparePassword('wrongpassword', hash);
    expect(isWrong).toBe(false);
  });

  it('should sign JWT token and decode verified payload', async () => {
    const payload = {
      id: 'usr-12345',
      email: 'test@edutrack.com',
      name: 'Test User',
      role: 'INSTRUCTOR' as const,
    };

    const token = await signToken(payload);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);

    const decoded = await verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe(payload.id);
    expect(decoded?.email).toBe(payload.email);
    expect(decoded?.role).toBe('INSTRUCTOR');
  });

  it('should return null for tampered JWT token', async () => {
    const decoded = await verifyToken('invalid.jwt.token.string');
    expect(decoded).toBeNull();
  });
});
