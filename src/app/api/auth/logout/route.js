import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ALLOWED_ROLES = ["ADMIN", "TELECALLER", "DRIVER"];

export async function POST(req) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role")?.toUpperCase();

    if (!role || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: "Valid role is required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    const cookieName = `auth_token_${role.toLowerCase()}`;

    cookieStore.set(cookieName, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Auth Logout Error]", err.message);

    return NextResponse.json(
      { success: false, error: "Logout failed" },
      { status: 500 }
    );
  }
}