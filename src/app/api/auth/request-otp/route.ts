import { NextRequest, NextResponse } from "next/server";
import { requestOtpCreation } from "@/lib/otp-store";

export const runtime = "nodejs";

const WMU_DOMAIN = "wmich.edu";

class OtpEmailSendError extends Error {
  status: number;

  providerDetails: string;

  constructor(status: number, providerDetails: string) {
    super(`Failed to send OTP email (${status})`);
    this.name = "OtpEmailSendError";
    this.status = status;
    this.providerDetails = providerDetails;
  }
}

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


function shouldUseDemoRecipient() {
  return process.env.RESEND_FORCE_DEMO_RECIPIENT?.toLowerCase() === "true";
}

function allowProdRealEmail() {
  return process.env.ALLOW_PROD_REAL_EMAIL?.toLowerCase() === "true";
}

function getOtpRecipient(email: string) {
  const demoRecipient = process.env.RESEND_DEMO_RECIPIENT?.trim();

  if (!demoRecipient) {
    return email;
  }

  // Safe default: in production, route to demo recipient unless explicitly allowed.
  if (process.env.NODE_ENV === "production" && !allowProdRealEmail()) {
    return demoRecipient;
  }

  if (process.env.NODE_ENV !== "production" || shouldUseDemoRecipient()) {
    return demoRecipient;
  }

  return email;
}

async function sendOtpEmail(email: string, otp: string) {
  const apiKey = process.env.RESEND_API_KEY || process.env.Resend_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Resend settings are not configured.");
  }

  const to = getOtpRecipient(email);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Your WMU Inventory login code",
      text: `Your verification code is ${otp}. It expires in 10 minutes.\n\nRequested for: ${email}`,
    }),
  });

  if (!response.ok) {
    const providerError = await response.text();
    throw new OtpEmailSendError(response.status, providerError);
  }
}

function getProviderStatusHint(status: number) {
  if (status === 401) {
    return "Invalid or missing RESEND_API_KEY.";
  }

  if (status === 403) {
    return "Sender/domain is not verified in Resend for this environment.";
  }

  if (status === 422) {
    return "Invalid email payload (usually FROM or TO address).";
  }

  if (status >= 500) {
    return "Email provider temporary outage.";
  }

  return "Email provider rejected the request.";
}

function getPublicErrorMessage(error: unknown) {
  if (error instanceof OtpEmailSendError) {
    const hint = getProviderStatusHint(error.status);
    return `Email provider rejected the OTP send request (${error.status}). ${hint}`;
  }

  const details = error instanceof Error ? error.message : String(error);

  if (details.includes("Resend settings are not configured")) {
    return "Email delivery is not configured on the server.";
  }

  return "Unable to send code right now.";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string };
    const normalizedEmail = normalizeEmail(body?.email ?? "");

    if (!normalizedEmail || !isAllowedEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: "Only @wmich.edu email addresses are allowed." },
        { status: 400 },
      );
    }

    const otpResult = await requestOtpCreation(normalizedEmail);

    if (!otpResult.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(otpResult.retryAfterSec) },
        },
      );
    }

    await sendOtpEmail(normalizedEmail, otpResult.otp);

    return NextResponse.json(
      { message: "If eligible, a verification code has been sent." },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof OtpEmailSendError) {
      console.error("OTP request failed", {
        status: error.status,
        providerDetails: error.providerDetails,
      });
    } else {
      console.error("OTP request failed", error);
    }

    return NextResponse.json({ error: getPublicErrorMessage(error) }, { status: 500 });
  }
}
