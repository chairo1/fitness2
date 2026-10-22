'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export function AdminLogin() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: String(form.get('email')),
        password: String(form.get('password')),
      }),
    });
    if (res.ok) router.refresh();
    else if (res.code === 'INVALID_CREDENTIALS') setError('E-poçt və ya şifrə yanlışdır.');
    else setError('Daxil olmaq mümkün olmadı.');
  }

  return (
    <main>
      <h1>Admin giriş</h1>
      <form onSubmit={onSubmit}>
        <label>
          E-poçt
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Şifrə
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit">Daxil ol</button>
      </form>
    </main>
  );
}
