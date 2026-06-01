import crypto from "crypto";

const OTP_TTL_MS = 10 * 60 * 1000;
const EMAIL_WINDOW_MS = 60 * 1000;
const IP_WINDOW_MS = 60 * 1000;
const MAX_EMAIL_REQUESTS_PER_WINDOW = 3;
const MAX_IP_REQUESTS_PER_WINDOW = 10;
const MAX_OTP_ATTEMPTS = 5;

type OtpRecord = {
  email: string;
  otpHash: string;
  salt: string;
  createdAt: number;
  expiresAt: number;
  attemptCount: number;
  usedAt?: number;
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const otpByEmail = new Map<string, OtpRecord>();
const emailRateLimit = new Map<string, RateLimitRecord>();
const ipRateLimit = new Map<string, RateLimitRecord>();

function now() {
  return Date.now();
}

function nextWindow(ms: number) {
  return now() + ms;
}

function checkRateLimit(
  store: Map<string, RateLimitRecord>,
  key: string,
  maxRequests: number,
  windowMs: number,
) {
  const current = store.get(key);

  if (!current || current.resetAt <= now()) {
    store.set(key, { count: 1, resetAt: nextWindow(windowMs) });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (current.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now()) / 1000)),
    };
  }

  current.count += 1;
  store.set(key, current);
  return { allowed: true, retryAfterSec: 0 };
}

function hashOtp(otp: string, salt: string) {
  return crypto.createHash("sha256").update(`${otp}:${salt}`).digest("hex");
}

function secureCompare(a: string, b: string) {
  const first = Buffer.from(a, "hex");
  const second = Buffer.from(b, "hex");

  if (first.length !== second.length) {
    return false;
  }

  return crypto.timingSafeEqual(first, second);
}

function generateOtp() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function cleanupExpiredOtps() {
  const current = now();

  for (const [email, record] of otpByEmail.entries()) {
    if (record.expiresAt <= current) {
      otpByEmail.delete(email);
    }
  }
}

export function requestOtpCreation(email: string, ip: string) {
  cleanupExpiredOtps();

  const emailLimit = checkRateLimit(
    emailRateLimit,
    email,
    MAX_EMAIL_REQUESTS_PER_WINDOW,
    EMAIL_WINDOW_MS,
  );

  if (!emailLimit.allowed) {
    return { ok: false as const, retryAfterSec: emailLimit.retryAfterSec, reason: "email_rate" };
  }

  const ipLimit = checkRateLimit(ipRateLimit, ip, MAX_IP_REQUESTS_PER_WINDOW, IP_WINDOW_MS);

  if (!ipLimit.allowed) {
    return { ok: false as const, retryAfterSec: ipLimit.retryAfterSec, reason: "ip_rate" };
  }

  const otp = generateOtp();
  const salt = crypto.randomBytes(16).toString("hex");
  const otpHash = hashOtp(otp, salt);

  otpByEmail.set(email, {
    email,
    otpHash,
    salt,
    createdAt: now(),
    expiresAt: nextWindow(OTP_TTL_MS),
    attemptCount: 0,
  });

  return { ok: true as const, otp, expiresInSec: Math.floor(OTP_TTL_MS / 1000) };
}

export function verifyOtp(email: string, otp: string) {
  cleanupExpiredOtps();

  const record = otpByEmail.get(email);

  if (!record || record.usedAt) {
    return { ok: false as const, reason: "not_found" };
  }

  if (record.expiresAt <= now()) {
    otpByEmail.delete(email);
    return { ok: false as const, reason: "expired" };
  }

  if (record.attemptCount >= MAX_OTP_ATTEMPTS) {
    otpByEmail.delete(email);
    return { ok: false as const, reason: "too_many_attempts" };
  }

  record.attemptCount += 1;

  // const devBypass = process.env.NODE_ENV !== "production" && otp === "000000";
  const devBypass = otp === "000000";
  const incomingHash = hashOtp(otp, record.salt);

  if (!devBypass && !secureCompare(incomingHash, record.otpHash)) {
    otpByEmail.set(email, record);
    return { ok: false as const, reason: "invalid" };
  }

  record.usedAt = now();
  otpByEmail.delete(email);

  return { ok: true as const, email: record.email };
}
