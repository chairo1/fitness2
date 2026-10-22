export interface ApiUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
  locale: string;
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  code: string | null;
}

/** Browser-side call to the same-origin API. */
export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...init.headers },
  });
  let body: unknown = null;
  if (res.status !== 204) {
    try {
      body = await res.json();
    } catch {
      body = null;
    }
  }
  const code =
    !res.ok && body && typeof body === 'object' && 'code' in body
      ? String((body as { code: unknown }).code)
      : null;
  return { ok: res.ok, status: res.status, data: res.ok ? (body as T) : null, code };
}
