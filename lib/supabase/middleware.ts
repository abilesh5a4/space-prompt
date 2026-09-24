import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase environment variables are missing, bypass middleware without crashing
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },

      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );

        supabaseResponse = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT:
  // Avoid writing logic between createServerClient and supabase.auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const protectedRoutes = [
    '/dashboard',
    '/studio',
    '/history',
    '/templates',
    '/favorites',
    '/settings',
  ];

  const authRoutes = ['/login', '/signup'];

  const pathname = request.nextUrl.pathname;

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const isAuthRoute = authRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Redirect unauthenticated users attempting to access protected routes to /login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();

    url.pathname = '/login';

    // Preserve both pathname and query parameters.
    // Example:
    // /studio?idea=build-an-ai-project
    // stays available after login.
    const returnUrl =
      request.nextUrl.pathname + request.nextUrl.search;

    url.searchParams.set('returnUrl', returnUrl);

    return NextResponse.redirect(url);
  }

  // Redirect authenticated users attempting to access /login or /signup to /dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();

    url.pathname = '/dashboard';

    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}