import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { AdminLogin } from '@/components/AdminLogin';
import { AdminLogout } from '@/components/AdminLogout';
import { resolveArea } from '@/lib/host';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Defence in depth: never render the admin UI on the web host, whatever the middleware did.
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (resolveArea(host, { ADMIN_HOST: process.env.ADMIN_HOST ?? '' }) !== 'admin') notFound();

  const user = await getCurrentUser();
  if (!user) return <AdminLogin />;
  if (user.role !== 'admin') {
    return (
      <main>
        <h1>İcazə yoxdur</h1>
        <AdminLogout />
      </main>
    );
  }
  return (
    <>
      <header className="bar">
        <strong>Admin panel</strong>
        <AdminLogout />
      </header>
      {children}
    </>
  );
}
