import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 renamed the `middleware` file convention to `proxy`.
 * This replaces middleware.ts (delete that file) and does two jobs:
 *
 * 1. Refreshes the Supabase auth session on every request. Required with
 *    @supabase/ssr — without it, session cookies are never refreshed.
 * 2. Optimistic route protection: /dashboard needs a signed-in user, and
 *    /login and /signup bounce signed-in users to the dashboard.
 *
 * This is only a first gate. The dashboard layout re-checks the user and
 * RLS enforces data access, so nothing relies on this file alone.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the session with Supabase and triggers the token
  // refresh when it is close to expiry.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  // Redirects must carry any cookies the refresh just set.
  const redirectTo = (path: string, query = "") => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = query;
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  if (isDashboard && !user) {
    return redirectTo("/login", `?next=${encodeURIComponent(pathname + search)}`);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    return redirectTo("/dashboard");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next internals)
     * - favicon.ico
     * - public assets (icons, brand, manifest, sw.js)
     * - image files (svg, png, jpg, jpeg, webp, ico)
     */
    "/((?!_next/static|_next/image|favicon.ico|icons|brand|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
