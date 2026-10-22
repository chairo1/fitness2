import { describe, expect, it } from 'vitest';
import { normalizeEmail, registerSchema } from './auth';

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
