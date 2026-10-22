import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function LandingPage() {
  const t = await getTranslations('Site');
  return (
    <main>
      <h1>{t('name')}</h1>
      <p>{t('tagline')}</p>
      <nav>
        <Link href="/register">{t('register')}</Link>
        <Link href="/login">{t('login')}</Link>
      </nav>
    </main>
  );
}
