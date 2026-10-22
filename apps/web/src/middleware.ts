import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { resolveArea } from './lib/host';

const intl = createIntlMiddleware(routing);

export default function middleware(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const area = resolveArea(host, { ADMIN_HOST: process.env.ADMIN_HOST ?? '' });
  const { pathname } = request.nextUrl;

  if (area === 'admin') {
    const url = request.nextUrl.clone();
    url.pathname = pathname === '/' ? '/admin' : `/admin${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Web host: the admin area must not be reachable at all.
  if (pathname.toLowerCase().startsWith('/admin')) {
    const url = request.nextUrl.clone();
    url.pathname = '/404';
    return NextResponse.rewrite(url, { status: 404 });
  }

  return intl(request);
}

export const config = {
  // Everything except the API proxy, Next internals and static files.
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
