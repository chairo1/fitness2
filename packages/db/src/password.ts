import * as argon2 from 'argon2';

/**
 * Single source of truth for password hashing parameters (OWASP minimum for
 * argon2id). Kept small so concurrent hashes fit the api's 256 MB limit.
 * Verification reads the parameters from the stored hash, so changing these
 * never invalidates existing hashes.
 */
export const PASSWORD_HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, PASSWORD_HASH_OPTIONS);
}
