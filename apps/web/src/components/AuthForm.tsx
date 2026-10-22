'use client';

import { useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { apiFetch } from '@/lib/api';

const KNOWN_ERRORS = ['EMAIL_TAKEN', 'INVALID_CREDENTIALS', 'BLOCKED', 'VALIDATION'];

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const t = useTranslations('Auth');
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isRegister = mode === 'register';

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const body = { email: String(form.get('email')), password: String(form.get('password')) };
    const res = await apiFetch(`/auth/${mode}`, {
      method: 'POST',
      body: JSON.stringify(isRegister ? { ...body, locale } : body),
    });
    if (res.ok) {
      router.push('/cabinet');
      return;
    }
    const key = res.code && KNOWN_ERRORS.includes(res.code) ? res.code : 'GENERIC';
    setError(t(`errors.${key}`));
    setBusy(false);
  }

  return (
    <main>
      <h1>{t(isRegister ? 'registerTitle' : 'loginTitle')}</h1>
      <form onSubmit={onSubmit}>
        <label>
          {t('email')}
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          {t('password')}
          <input
            name="password"
            type="password"
            required
            minLength={isRegister ? 8 : 1}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
        </label>
        {isRegister && <span className="hint">{t('passwordHint')}</span>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy}>
          {t(isRegister ? 'submitRegister' : 'submitLogin')}
        </button>
      </form>
      <p>
        {t(isRegister ? 'haveAccount' : 'noAccount')}{' '}
        <Link href={isRegister ? '/login' : '/register'}>
          {t(isRegister ? 'loginTitle' : 'registerTitle')}
        </Link>
      </p>
    </main>
  );
}
