'use client';

import { useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

export function LanguageSwitch() {
  const current = useLocale();
  const pathname = usePathname();
  return (
    <div className="lang">
      {routing.locales.map((l) => (
        <Link key={l} href={pathname} locale={l} aria-current={l === current}>
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
