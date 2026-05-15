"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";

const WMU_DOMAIN = "wmich.edu";
const OTP_LENGTH = 6;

type AuthStep = "request" | "verify" | "app";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isWmuEmail(value: string) {
  const email = normalizeEmail(value);
  const parts = email.split("@");

  if (parts.length !== 2) {
    return false;
  }

  return parts[1] === WMU_DOMAIN;
}

export default function Home() {
  const [authStep, setAuthStep] = useState<AuthStep>("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState("");

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const emailLooksValid = isWmuEmail(normalizedEmail);
  const appEmail = signedInEmail || normalizedEmail;

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session");

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { email?: string };

        if (isMounted && data.email) {
          setSignedInEmail(data.email);
          setAuthStep("app");
        }
      } catch {
        // Login screen remains the fallback when no session is available.
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRequestOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (otpSent || isSubmitting) {
      return;
    }

    if (!normalizedEmail) {
      setError("Enter your WMU email address to continue.");
      return;
    }

    if (!emailLooksValid) {
      setError("Only @wmich.edu accounts are allowed.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setInfo("");

    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setError(data.error || "Unable to send code right now.");
        return;
      }

      setOtpSent(true);
      setAuthStep("verify");
      setInfo("OTP sent successfully. Please check your WMU email inbox.");
    } catch {
      setError("Unable to send code right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (otp.length !== OTP_LENGTH) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setInfo("");

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, otp }),
      });

      const data = (await response.json()) as { error?: string; email?: string };

      if (!response.ok) {
        setError(data.error || "Unable to verify code right now.");
        return;
      }

      setSignedInEmail(data.email || normalizedEmail);
      setAuthStep("app");
    } catch {
      setError("Unable to verify code right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetRequestState = () => {
    setAuthStep("request");
    setOtpSent(false);
    setIsSubmitting(false);
    setEmail("");
    setOtp("");
    setError("");
    setInfo("");
    setSignedInEmail("");
  };

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    resetRequestState();
  };

  if (authStep === "app") {
    return (
      <main className="min-h-screen bg-[#f6f1e8] text-stone-900">
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-4">
              <Image
                src="/wmu-logo.png"
                alt="Western Michigan University logo"
                width={160}
                height={46}
                className="h-auto w-[160px] max-w-full"
                priority
              />
              <div>
                <p className="text-xs font-semibold uppercase text-stone-500">Inventory</p>
                <h1 className="text-lg font-semibold text-[#2f200f]">Dashboard</h1>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-400 hover:text-stone-950"
            >
              Sign Out
            </button>
          </div>
        </header>

        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-stone-950">Welcome back</h2>
            <p className="mt-1 text-sm text-stone-600">{appEmail}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              ["Total Items", "2,184"],
              ["Low Stock", "26"],
              ["Pending Requests", "14"],
              ["Checked Out", "372"],
            ].map(([label, value]) => (
              <article key={label} className="rounded-lg border border-stone-200 bg-white p-4">
                <p className="text-sm text-stone-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-stone-950">{value}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white">
            <div className="border-b border-stone-200 px-4 py-3">
              <h3 className="font-semibold text-stone-950">Recent Inventory Activity</h3>
            </div>
            <div className="divide-y divide-stone-100">
              {[
                ["Dell Latitude 5430", "Checked Out", "Engineering Lab"],
                ["Epson PowerLite 2250U", "Maintenance", "AV Services"],
                ["Logitech Rally Cam", "Available", "Main Campus"],
              ].map(([item, status, owner]) => (
                <div key={item} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-3">
                  <span className="font-medium text-stone-950">{item}</span>
                  <span className="text-stone-600">{status}</span>
                  <span className="text-stone-500">{owner}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_50%_0%,#fff6e7_0%,#f7ecdc_34%,#eadac6_100%)] p-4">
      <section className="w-full max-w-md rounded-3xl border border-[#d8c4a7] bg-white/95 p-7 shadow-[0_18px_50px_rgba(58,38,17,0.16)] backdrop-blur sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/wmu-logo.png"
            alt="Western Michigan University logo"
            width={200}
            height={58}
            className="h-auto w-[200px] max-w-full"
            priority
          />
          <h1 className="mt-4 text-2xl font-semibold text-[#2f200f]">Sign in to Inventory</h1>
          <p className="mt-2 text-sm text-stone-600">Use your WMU email to receive a one-time passcode.</p>
        </div>

        {authStep === "request" && (
          <form className="space-y-4" onSubmit={handleRequestOtp}>
          <label className="block text-sm font-medium text-stone-700" htmlFor="email">
            WMU Email Address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="broncos@wmich.edu"
            disabled={otpSent}
            className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-[#8a6331] focus:ring-3 focus:ring-[#d9b98a66] disabled:cursor-not-allowed disabled:bg-stone-100"
          />

          {!!email && !emailLooksValid && !otpSent && (
            <p className="text-sm font-medium text-amber-700">
              Only addresses ending in @wmich.edu can continue.
            </p>
          )}

          {!!error && <p className="text-sm font-medium text-red-700">{error}</p>}
          {!!info && <p className="text-sm font-medium text-emerald-700">{info}</p>}

          <button
            type="submit"
            disabled={otpSent || isSubmitting}
            className="w-full rounded-xl bg-[#4a2f14] px-4 py-3 text-sm font-semibold text-[#f8e8c5] transition hover:bg-[#5c3a18] disabled:cursor-not-allowed disabled:bg-[#8a6f4e]"
          >
            {otpSent ? "OTP Sent" : isSubmitting ? "Sending..." : "Send Verification Code"}
          </button>

          {otpSent && (
            <button
              type="button"
              onClick={resetRequestState}
              className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-400 hover:text-stone-900"
            >
              Reset for Demo
            </button>
          )}
          </form>
        )}

        {authStep === "verify" && (
          <form className="space-y-4" onSubmit={handleVerifyOtp}>
            <div>
              <p className="text-sm text-stone-600">
                Enter the 6-digit code sent for <span className="font-semibold">{normalizedEmail}</span>.
              </p>
            </div>

            <label className="block text-sm font-medium text-stone-700" htmlFor="otp">
              Verification Code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={OTP_LENGTH}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full rounded-xl border border-stone-300 px-4 py-3 text-center text-xl tracking-[0.35em] outline-none transition focus:border-[#8a6331] focus:ring-3 focus:ring-[#d9b98a66]"
            />

            {!!error && <p className="text-sm font-medium text-red-700">{error}</p>}
            {!!info && <p className="text-sm font-medium text-emerald-700">{info}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#4a2f14] px-4 py-3 text-sm font-semibold text-[#f8e8c5] transition hover:bg-[#5c3a18] disabled:cursor-not-allowed disabled:bg-[#8a6f4e]"
            >
              {isSubmitting ? "Verifying..." : "Verify and Continue"}
            </button>

            <button
              type="button"
              onClick={resetRequestState}
              className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-400 hover:text-stone-900"
            >
              Use a Different Email
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
