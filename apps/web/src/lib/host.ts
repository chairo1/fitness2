export type Area = 'admin' | 'web';

/** Normalise a Host / X-Forwarded-Host value: first entry, port stripped, lowercased. */
function normalizeHost(value: string): string {
  const first = value.split(',')[0] ?? '';
  return first.trim().toLowerCase().replace(/:\d+$/, '');
}

export function resolveArea(host: string | null, env: { ADMIN_HOST: string }): Area {
  const admin = normalizeHost(env.ADMIN_HOST ?? '');
  if (!admin || !host) return 'web';
  return normalizeHost(host) === admin ? 'admin' : 'web';
}
