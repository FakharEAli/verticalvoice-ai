import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/auth/middleware';
import { checkRateLimit } from '@/lib/security/rate-limit';

const PUBLIC_ROUTES = new Set([
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/verify-email',
  '/callback',
  // Public marketing site — the (marketing) route group. Anonymous visitors
  // must be able to reach all of these before creating an account.
  '/industries',
  '/how-it-works',
  '/pricing',
  '/security',
  '/demo',
  '/privacy',
  '/terms',
]);

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  if (pathname.startsWith('/industries/')) return true;
  if (pathname.startsWith('/api/v1/webhooks/')) return true;
  if (pathname.startsWith('/_next/') || pathname.startsWith('/favicon')) return true;
  return false;
}

// ─── Rate limiting ──────────────────────────────────────────────────────────
// Webhooks are excluded — they're provider-authenticated (HMAC signature) and
// providers may legitimately burst-deliver many events after an outage.
// `/api/v1/tools/*` is call-token authenticated (one token per live call) and
// gets a tighter budget since it's invoked repeatedly during a single call.

const GENERAL_API_LIMIT = 100; // requests per window, per IP
const TOOLS_API_LIMIT = 60; // requests per window, per IP (tools are chatty but bounded per call)
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

function applyApiRateLimit(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/api/v1/') || pathname.startsWith('/api/v1/webhooks/')) {
    return null;
  }

  const ip = getClientIp(request);
  const isToolsRoute = pathname.startsWith('/api/v1/tools/');
  const limit = isToolsRoute ? TOOLS_API_LIMIT : GENERAL_API_LIMIT;
  const key = `ip:${ip}:${isToolsRoute ? 'tools' : 'api'}`;

  const result = checkRateLimit(key, limit, RATE_LIMIT_WINDOW_MS);

  if (!result.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many requests, please slow down.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.resetAt),
        },
      },
    );
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rateLimited = applyApiRateLimit(request);
  if (rateLimited) return rateLimited;

  if (isPublicRoute(pathname)) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  const { supabaseResponse, user } = await updateSession(request);

  if (!user) {
    // API routes should get a 401 JSON response, not an HTML redirect.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
