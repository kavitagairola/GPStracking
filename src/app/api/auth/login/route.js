  import { NextResponse } from "next/server";
  import { query } from "@/lib/db";
  import bcrypt from "bcryptjs";
  import jwt from "jsonwebtoken";
  import { cookies } from "next/headers";

  const JWT_SECRET = process.env.JWT_SECRET || "resqtrack_secret_fallback";
  

  export async function POST(req) {
    try {
      const body = await req.json();
      const { role, email, password, vehicleInput } = body;
      const COOKIE_NAME = `auth_token_${role.toLowerCase()}`;

      if (!role || !password) {
        return NextResponse.json(
          { success: false, error: "Role and password are required" },
          { status: 400 }
        );
      }

      let user = null;

      if (role === "DRIVER") {
        // Driver login: match by vehicle_name
        if (!vehicleInput) {
          return NextResponse.json(
            { success: false, error: "Vehicle/Ambulance number is required" },
            { status: 400 }
          );
        }

        // Normalize vehicle input: "Ambulance 01", "Ambulance 1", "1" all work
        const digits = vehicleInput.match(/\d+/);
        const num = digits ? parseInt(digits[0], 10) : null;
        const normalizedVehicle = num ? `Ambulance ${String(num).padStart(2, "0")}` : vehicleInput.trim();

        const result = await query(
          "SELECT * FROM users WHERE vehicle_name = $1 AND role = 'DRIVER'",
          [normalizedVehicle]
        );
        user = result.rows[0];
      } else {
        // Admin / Telecaller login: match by email + role
        if (!email) {
          return NextResponse.json(
            { success: false, error: "Email is required" },
            { status: 400 }
          );
        }
        const result = await query(
          "SELECT * FROM users WHERE email = $1 AND role = $2",
          [email.toLowerCase().trim(), role]
        );
        user = result.rows[0];
      }

      if (!user) {
        return NextResponse.json(
          { success: false, error: "Invalid credentials. Please check your details." },
          { status: 401 }
        );
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return NextResponse.json(
          { success: false, error: "Incorrect password." },
          { status: 401 }
        );
      }

      // Create JWT payload
      const payload = {
        userId: user.id,
        name: user.name,
        role: user.role,
        email: user.email || null,
        vehicleName: user.vehicle_name || null,
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

      // Set HTTP-only cookie
      const cookieStore = await cookies();
      cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });

      return NextResponse.json({
        success: true,
        role: user.role,
        name: user.name,
        vehicleName: user.vehicle_name || null,
      });
    } catch (err) {
      console.error("[Auth Login Error]", err.message);
      return NextResponse.json(
        { success: false, error: "Server error. Please try again." },
        { status: 500 }
      );
    }
  }
