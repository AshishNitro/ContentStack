import { NextRequest, NextResponse } from 'next/server';

const LOCALES = new Set(['us', 'in', 'eu', 'uk', 'au', 'ca', 'de', 'fr', 'jp', 'br']);
const cache = new Map<string, { domainId: number; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

function normalizeHost(host: string) {
  return host.replace(/^www\./, '').replace(/:\d+$/, '').toLowerCase();
}

function isAdminHost(host: string) {
  const normalized = normalizeHost(host);
  const knownHosts = [
    'localhost',
    '127.0.0.1',
    process.env.FRONTEND_PRIMARY_HOST || '',
    process.env.VERCEL_URL || '',
  ]
    .map(value => normalizeHost(value))
    .filter(Boolean);

  return knownHosts.includes(normalized);
}

async function resolveDomainId(host: string): Promise<number | null> {
  const now = Date.now();
  const cached = cache.get(host);

  if (cached && cached.expiresAt > now) {
    return cached.domainId;
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const response = await fetch(`${apiBase}/domains/resolve?host=${encodeURIComponent(host)}`);

  if (!response.ok) {
    return null;
  }

  try {
    const domain = await response.json();
    if (!domain || !domain.id) return null;

    cache.set(host, {
      domainId: domain.id,
      expiresAt: now + CACHE_TTL_MS,
    });

    return domain.id;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const hostHeader = request.headers.get('host');
  if (!hostHeader) return NextResponse.next();

  const host = normalizeHost(hostHeader);
  if (isAdminHost(host)) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  const segments = pathname.split('/').filter(Boolean);

  let locale: string | null = null;
  let contentSegments = segments;

  if (segments[0] && LOCALES.has(segments[0])) {
    locale = segments[0];
    contentSegments = segments.slice(1);
  }

  const domainId = await resolveDomainId(host);
  if (!domainId) return NextResponse.next();

  const rewriteUrl = request.nextUrl.clone();

  if (contentSegments.length === 0) {
    rewriteUrl.pathname = locale ? `/${locale}/preview/${domainId}` : `/preview/${domainId}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  if (contentSegments.length === 1) {
    rewriteUrl.pathname = locale
      ? `/${locale}/preview/${domainId}/${contentSegments[0]}`
      : `/preview/${domainId}/${contentSegments[0]}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
