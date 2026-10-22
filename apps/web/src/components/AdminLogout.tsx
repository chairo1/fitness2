'use client';

import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export function AdminLogout() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await apiFetch('/auth/logout', { method: 'POST' });
        router.refresh();
      }}
    >
      Çıxış
    </button>
  );
}
