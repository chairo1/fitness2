import { describe, expect, it } from 'vitest';
import { loginSchema, normalizeEmail, registerSchema } from './auth';

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Ali@Mail.COM ')).toBe('ali@mail.com');
  });
});

describe('registerSchema', () => {
  it('rejects a 7-char password', () => {
    expect(() => registerSchema.parse({ email: 'a@b.az', password: '1234567' })).toThrow();
  });
  it('defaults locale to az', () => {
    expect(registerSchema.parse({ email: 'a@b.az', password: '12345678' }).locale).toBe('az');
  });
});

describe('email normalization in schemas', () => {
  it('registerSchema trims and lowercases the email', () => {
    const r = registerSchema.parse({ email: ' Ali@Mail.com ', password: '12345678' });
    expect(r.email).toBe('ali@mail.com');
  });
  it('loginSchema trims and lowercases the email', () => {
    expect(loginSchema.parse({ email: ' Ali@Mail.com ', password: 'x' }).email).toBe('ali@mail.com');
  });
});
