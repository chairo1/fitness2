import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LogoutButton } from '@/components/LogoutButton';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function CabinetPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: '/login', locale });
  const t = await getTranslations('Cabinet');
  return (
    <main>
      <h1>{t('title')}</h1>
      <p>
        {t('signedInAs')}: <strong data-testid="user-email">{user.email}</strong>
      </p>
      <LogoutButton />
    </main>
  );
}
