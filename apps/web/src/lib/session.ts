import 'server-only';
import { headers } from 'next/headers';
import type { ApiUser } from './api';

/** Server-side GET /api/auth/me, forwarding the incoming cookie. Returns null if not signed in. */
export async function getCurrentUser(): Promise<ApiUser | null> {
  const base = process.env.API_INTERNAL_URL ?? 'http://localhost:3000';
  const cookie = (await headers()).get('cookie');
  if (!cookie) return null;
  try {
    const res = await fetch(`${base}/api/auth/me`, { headers: { cookie }, cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as ApiUser;
  } catch {
    return null;
  }
}
