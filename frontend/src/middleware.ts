import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding"];

function pathWithoutLocale(pathname: string): string {
  return pathname.replace(/^\/(en|fa)/, "") || "/";
}

export function middleware(request: NextRequest) {
  const stripped = pathWithoutLocale(request.nextUrl.pathname);

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => stripped === p || stripped.startsWith(p + "/")
  );

  if (isProtected && !request.cookies.has("ideapop_persona")) {
    const locale =
      request.nextUrl.pathname.match(/^\/(en|fa)/)?.[1] ?? "en";
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/sign-up`;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)" ],
};
