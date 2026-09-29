import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "resqtrack_secret_fallback";

const ALLOWED_ROLES = ["ADMIN", "TELECALLER", "DRIVER"];

export async function GET(req) {
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
    const token = cookieStore.get(cookieName)?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const payload = jwt.verify(token, JWT_SECRET);

    // Extra safety: token role must match requested dashboard role
    if (payload.role !== role) {
      return NextResponse.json(
        { success: false, error: "Invalid role session" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        userId: payload.userId,
        name: payload.name,
        role: payload.role,
        email: payload.email || null,
        vehicleName: payload.vehicleName || null,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid or expired token" },
      { status: 401 }
    );
  }
}