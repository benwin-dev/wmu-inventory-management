import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp-store";
import { createSession } from "@/lib/session-store";

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

    const result = verifyOtp(email, otp);

    if (!result.ok) {
      return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 401 });
    }

    const session = createSession(result.email);
    const response = NextResponse.json({ email: result.email }, { status: 200 });

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
