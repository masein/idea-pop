import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/profile"];

// These paths require a specific persona — any other persona (including kids)
// is redirected to the sign-up page.
const PERSONA_REQUIRED: Array<{ prefix: string; personas: string[] }> = [
  { prefix: "/dashboard/parent", personas: ["parent"] },
  { prefix: "/dashboard/teacher", personas: ["teacher"] },
  { prefix: "/dashboard/reviewer", personas: ["reviewer", "admin"] },
];

function pathWithoutLocale(pathname: string): string {
  return pathname.replace(/^\/(en|fa)/, "") || "/";
}

export function middleware(request: NextRequest) {
  const stripped = pathWithoutLocale(request.nextUrl.pathname);
  const locale = request.nextUrl.pathname.match(/^\/(en|fa)/)?.[1] ?? "en";

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => stripped === p || stripped.startsWith(p + "/")
  );

  if (isProtected && !request.cookies.has("ideapop_persona")) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/sign-up`;
    return NextResponse.redirect(url);
  }

  // Persona-specific route guards — kids and wrong-role adults get bounced
  if (request.cookies.has("ideapop_persona")) {
    const persona = request.cookies.get("ideapop_persona")?.value ?? "";
    const rule = PERSONA_REQUIRED.find(
      (r) => stripped === r.prefix || stripped.startsWith(r.prefix + "/")
    );
    if (rule && !rule.personas.includes(persona)) {
      const url = request.nextUrl.clone();
      // Kids go to /profile; wrong-role adults go to their own dashboard
      url.pathname = persona === "kid" ? `/${locale}/profile` : `/${locale}/sign-up`;
      return NextResponse.redirect(url);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|models|_next|_vercel|.*\\..*).*)"],
};
