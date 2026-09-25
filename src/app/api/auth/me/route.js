import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "resqtrack_secret_fallback";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const payload = jwt.verify(token, JWT_SECRET);

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
    return NextResponse.json({ success: false, error: "Invalid or expired token" }, { status: 401 });
  }
}
