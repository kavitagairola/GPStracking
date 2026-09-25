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

  const token = request.cookies.get("auth_token")?.value;

  // Check if this is a protected route
  const matchedRoute = PROTECTED_ROUTES.find((r) =>
    pathname.startsWith(r.prefix)
  );

  if (matchedRoute) {
    // No token → redirect to login
    if (!token) {
      const loginUrl = new URL("/", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);

      // Wrong role → redirect to their correct dashboard
      if (payload.role !== matchedRoute.role) {
        const dashboardMap = {
          ADMIN: "/admin",
          TELECALLER: "/telecaller",
          DRIVER: "/driver",
        };
        return NextResponse.redirect(
          new URL(dashboardMap[payload.role] || "/", request.url)
        );
      }

      // Valid — attach user info to headers for server components
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", String(payload.userId));
      requestHeaders.set("x-user-name", payload.name);
      requestHeaders.set("x-user-role", payload.role);

      return NextResponse.next({ request: { headers: requestHeaders } });
    } catch {
      // Invalid/expired token → redirect to login
      const loginUrl = new URL("/", request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("auth_token");
      return response;
    }
  }

  // Login page (/) — if already logged in, redirect to dashboard
  if (pathname === "/") {
    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const dashboardMap = {
          ADMIN: "/admin",
          TELECALLER: "/telecaller",
          DRIVER: "/driver",
        };
        const dest = dashboardMap[payload.role];
        if (dest) {
          return NextResponse.redirect(new URL(dest, request.url));
        }
      } catch {
        // Invalid token — let them see login page
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)).*)",
  ],
};
