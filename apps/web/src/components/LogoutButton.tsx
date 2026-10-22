'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { apiFetch } from '@/lib/api';

export function LogoutButton() {
  const t = useTranslations('Cabinet');
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await apiFetch('/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
      }}
    >
      {t('logout')}
    </button>
  );
}
