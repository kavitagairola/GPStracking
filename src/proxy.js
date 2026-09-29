import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "resqtrack_gokuldham_super_secret_jwt_key_2026"
);

// Routes that require authentication and their allowed roles
const PROTECTED_ROUTES = [
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/telecaller", role: "TELECALLER" },
  { prefix: "/driver", role: "DRIVER" },
];

const getCookieName = (role) => `auth_token_${role.toLowerCase()}`;

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Skip API routes and static files
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check which protected dashboard is being accessed
  const matchedRoute = PROTECTED_ROUTES.find((r) =>
    pathname.startsWith(r.prefix)
  );

  // ---------------------------------------------------------
  // PROTECTED DASHBOARD ROUTES
  // ---------------------------------------------------------
  if (matchedRoute) {
    const cookieName = getCookieName(matchedRoute.role);

    const token =
      request.cookies.get(cookieName)?.value || null;

    // No token for this specific role
    if (!token) {
      const loginUrl = new URL("/", request.url);

      // Remember which dashboard the user tried to access
      loginUrl.searchParams.set("redirect", pathname);

      return NextResponse.redirect(loginUrl);
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);

      // Extra safety:
      // token role must match the dashboard being accessed
      if (payload.role !== matchedRoute.role) {
        const dashboardMap = {
          ADMIN: "/admin",
          TELECALLER: "/telecaller",
          DRIVER: "/driver",
        };

        const correctDashboard =
          dashboardMap[payload.role] || "/";

        return NextResponse.redirect(
          new URL(correctDashboard, request.url)
        );
      }

      // Attach authenticated user information to request headers
      const requestHeaders = new Headers(request.headers);

      requestHeaders.set(
        "x-user-id",
        String(payload.userId)
      );

      requestHeaders.set(
        "x-user-name",
        String(payload.name || "")
      );

      requestHeaders.set(
        "x-user-role",
        String(payload.role || "")
      );

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch {
      // Invalid / expired token.
      // Delete ONLY this dashboard's cookie.
      const loginUrl = new URL("/", request.url);

      loginUrl.searchParams.set("redirect", pathname);

      const response = NextResponse.redirect(loginUrl);

      response.cookies.delete(cookieName);

      return response;
    }
  }

  // ---------------------------------------------------------
  // LOGIN PAGE
  // ---------------------------------------------------------
  //
  // IMPORTANT:
  // Do NOT check any auth cookie here.
  //
  // The same Chrome profile can have:
  // auth_token_admin
  // auth_token_telecaller
  // auth_token_driver
  //
  // The login page must always remain accessible so that
  // another dashboard can be logged in from another tab.
  //
  if (pathname === "/") {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)).*)",
  ],
};