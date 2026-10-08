import { NextResponse, type NextRequest } from "next/server";

/**
 * Network boundary (§60): per-request CSP nonce + security headers.
 * Authorisation is NOT decided here — every page, action and API route
 * verifies the session on the server. This only short-circuits obviously
 * unauthenticated navigation to protected areas.
 */
const COOKIE = process.env.NODE_ENV === "production" ? "__Host-fcgbs_session" : "fcgbs_session";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self' https:",
    "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(COOKIE)?.value);
  if (!hasSession && (pathname.startsWith("/student") || pathname.startsWith("/admin") || pathname.startsWith("/teach"))) {
    const to = pathname.startsWith("/admin") || pathname.startsWith("/teach") ? "/backend" : "/login";
    const url = new URL(to, request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/|sw.js|manifest.webmanifest|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
