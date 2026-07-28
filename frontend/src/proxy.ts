import { NextRequest, NextResponse } from 'next/server';

const LOCALES = new Set(['us', 'in', 'eu', 'uk', 'au', 'ca', 'de', 'fr', 'jp', 'br']);

// Simple in-memory cache: host → { domainId, expiresAt }
const cache = new Map<string, { domainId: number; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

function normalizeHost(host: string) {
  return host.replace(/^www\./, '').replace(/:\d+$/, '').toLowerCase();
}

/**
 * Returns true for the CMS admin host itself so it is never proxied.
 * Any host stored in the DB as a custom domain will be proxied.
 */
function isAdminHost(host: string) {
  const normalized = normalizeHost(host);
  const knownHosts = [
    'localhost',
    '127.0.0.1',
    process.env.FRONTEND_PRIMARY_HOST || '',
    process.env.VERCEL_URL || '',
  ]
    .map(v => normalizeHost(v))
    .filter(Boolean);

  return knownHosts.includes(normalized);
}

/**
 * Resolve the domainId for a given host from the backend API.
 * Result is cached for CACHE_TTL_MS to avoid a DB round-trip on every request.
 */
async function resolveDomainId(host: string): Promise<number | null> {
  const now = Date.now();
  const cached = cache.get(host);
  if (cached && cached.expiresAt > now) return cached.domainId;

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  try {
    const response = await fetch(
      `${apiBase}/domains/resolve?host=${encodeURIComponent(host)}`
    );
    if (!response.ok) return null;

    const domain = await response.json();
    if (!domain?.id) return null;

    cache.set(host, { domainId: domain.id, expiresAt: now + CACHE_TTL_MS });
    return domain.id;
  } catch {
    return null;
  }
}

/**
 * Next.js Edge Middleware — runs before every page render.
 *
 * Logic:
 *  1. If request is for the admin/CMS host → pass through untouched.
 *  2. Otherwise look up the host in the DB.
 *     If found, rewrite the URL so the same Next.js app serves the blog:
 *
 *       custom-domain.com/            → /preview/{domainId}
 *       custom-domain.com/us          → /us/preview/{domainId}          (locale prefix)
 *       custom-domain.com/us/my-post  → /us/preview/{domainId}/my-post  (slug)
 *
 *  3. If the host is not in the DB → pass through (404 naturally follows).
 *
 * This makes the system fully dynamic — ANY domain added through the CMS
 * is automatically handled here without any code changes.
 */
export async function proxy(request: NextRequest) {
  const hostHeader = request.headers.get('host');
  if (!hostHeader) return NextResponse.next();

  const host = normalizeHost(hostHeader);

  // Let the admin/CMS host through unchanged
  if (isAdminHost(host)) return NextResponse.next();

  // Dynamically resolve which domain this host belongs to
  const domainId = await resolveDomainId(host);
  if (!domainId) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  const segments = pathname.split('/').filter(Boolean);

  // Separate locale prefix from content segments
  let locale: string | null = null;
  let contentSegments = segments;

  if (segments[0] && LOCALES.has(segments[0])) {
    locale = segments[0];
    contentSegments = segments.slice(1);
  }

  const rewriteUrl = request.nextUrl.clone();

  // Root of the domain  →  show domain's blog index
  if (contentSegments.length === 0) {
    rewriteUrl.pathname = locale
      ? `/${locale}/preview/${domainId}`
      : `/preview/${domainId}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  // One content segment  →  could be a post slug
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
