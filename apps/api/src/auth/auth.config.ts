export const SESSION_COOKIE = 'fit_session';
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return secret;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function getAuthThrottle(): { limit: number; ttlMs: number } {
  return {
    limit: positiveInt(process.env.THROTTLE_AUTH_LIMIT, 10),
    ttlMs: positiveInt(process.env.THROTTLE_AUTH_TTL_SEC, 900) * 1000,
  };
}
