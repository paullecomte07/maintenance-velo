import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // getUser() a pu consommer le refresh token et en poser un neuf sur
  // supabaseResponse. Une redirection construite à part perdrait ces cookies,
  // et la session mourrait au passage : on les reporte systématiquement.
  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  const { pathname } = request.nextUrl;

  // Atteignables sans session.
  const isPublicPage =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/auth/callback");

  // Celles qui n'ont plus de sens une fois connecté. /reset-password en est
  // volontairement absent : le lien de récupération ouvre une session, et
  // c'est justement connecté qu'on y choisit son nouveau mot de passe.
  const isSignedOutOnlyPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password";

  if (!user && !isPublicPage) {
    return redirectTo("/login");
  }

  if (user && isSignedOutOnlyPage) {
    return redirectTo("/bikes");
  }

  return supabaseResponse;
}
