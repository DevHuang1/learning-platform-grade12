import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/auth", "/register"];

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase isn't configured, allow the app to run in offline/demo mode.
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Authenticated users are sent away from the landing page and the public
  // auth paths, straight into the app.
  if (
    user &&
    (pathname === "/" ||
      PUBLIC_PATHS.some((p) => pathname.startsWith(p)))
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Unauthenticated users are redirected to login for protected routes; the
  // landing page at "/" stays public for everyone.
  if (
    !user &&
    pathname !== "/" &&
    !PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.redirect(
      new URL("/login?next=" + encodeURIComponent(pathname), request.url),
    );
  }

  return response;
}

export const config = {
  matcher: [
    // Exclude static assets and api/auth internals.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};