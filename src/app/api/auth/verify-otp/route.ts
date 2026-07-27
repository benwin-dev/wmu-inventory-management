import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp-store";
import { createSession, UserRole } from "@/lib/session-store";
import { getDbPool } from "@/lib/db";

const WMU_DOMAIN = "wmich.edu";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isAllowedEmail(email: string) {
  const parts = email.split("@");

  if (parts.length !== 2) {
    return false;
  }

  return parts[1] === WMU_DOMAIN;
}

function isValidOtp(value: string) {
  return /^\d{6}$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; otp?: string };
    const email = normalizeEmail(body?.email ?? "");
    const otp = (body?.otp ?? "").trim();

    if (!email || !isAllowedEmail(email) || !isValidOtp(otp)) {
      return NextResponse.json({ error: "Invalid verification request." }, { status: 400 });
    }

    const result = await verifyOtp(email, otp);

    if (!result.ok) {
      return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 401 });
    }

    // Look up role from DB
    const pool = getDbPool();
    const roleResult = await pool.query<{ role: string; cafe_id: number | null }>(
      `SELECT role, cafe_id FROM user_roles WHERE email = $1`,
      [result.email],
    );

    if (roleResult.rows.length === 0) {
      return NextResponse.json({ error: "Your account has not been granted access. Please contact your administrator." }, { status: 403 });
    }

    const role = roleResult.rows[0].role as UserRole;
    const cafe_id = roleResult.rows[0].cafe_id ?? null;
    const redirectMap: Record<UserRole, string> = {
      admin: "/admin",
      commissary: "/",
      cafe: "/request",
      driver: "/fulfillment",
    };

    const session = await createSession(result.email, role, cafe_id);
    const response = NextResponse.json({ email: result.email, role, cafe_id, redirect: redirectMap[role] }, { status: 200 });

    response.cookies.set({
      name: "wmu_inventory_session",
      value: session.token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: session.maxAgeSec,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("OTP verification failed", error);
    return NextResponse.json({ error: "Unable to verify code right now." }, { status: 500 });
  }
}
