import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('NotFound');
  return (
    <main>
      <h1>404</h1>
      <p>{t('title')}</p>
      <a href="/az">{t('home')}</a>
    </main>
  );
}
