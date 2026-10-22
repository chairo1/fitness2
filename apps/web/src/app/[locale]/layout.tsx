import type { ReactNode } from 'react';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('Site');
  return (
    <NextIntlClientProvider>
      <header className="bar">
        <Link href="/">{t('name')}</Link>
        <LanguageSwitch />
      </header>
      {children}
    </NextIntlClientProvider>
  );
}
