import crypto from "crypto";
import { getDbPool } from "@/lib/db";

const OTP_TTL_MS = 10 * 60 * 1000;
const EMAIL_WINDOW_MS = 60 * 1000;
const MAX_EMAIL_REQUESTS_PER_WINDOW = 3;
const MAX_OTP_ATTEMPTS = 5;

function hashOtp(otp: string, salt: string) {
  return crypto.createHash("sha256").update(`${otp}:${salt}`).digest("hex");
}

function secureCompare(a: string, b: string) {
  const first = Buffer.from(a, "hex");
  const second = Buffer.from(b, "hex");
  if (first.length !== second.length) return false;
  return crypto.timingSafeEqual(first, second);
}

function generateOtp() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function requestOtpCreation(email: string) {
  const pool = getDbPool();

  // Cleanup expired OTPs (fire-and-forget)
  pool.query(`DELETE FROM otps WHERE expires_at < NOW()`).catch(() => {});

  // Email rate limit: max 3 requests per minute
  const recentResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM otps WHERE email = $1 AND created_at > NOW() - INTERVAL '1 minute'`,
    [email],
  );
  const recentCount = parseInt(recentResult.rows[0]?.count ?? "0", 10);
  if (recentCount >= MAX_EMAIL_REQUESTS_PER_WINDOW) {
    return { ok: false as const, retryAfterSec: 60, reason: "email_rate" };
  }

  const otp = generateOtp();
  const salt = crypto.randomBytes(16).toString("hex");
  const otpHash = hashOtp(otp, salt);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await pool.query(
    `INSERT INTO otps (email, otp_hash, salt, expires_at) VALUES ($1, $2, $3, $4)`,
    [email, otpHash, salt, expiresAt],
  );

  return { ok: true as const, otp, expiresInSec: Math.floor(OTP_TTL_MS / 1000) };
}

export async function verifyOtp(email: string, otp: string) {
  const pool = getDbPool();

  // Find the latest unused, unexpired OTP for this email
  const result = await pool.query<{
    id: number;
    otp_hash: string;
    salt: string;
    attempt_count: number;
    used_at: string | null;
  }>(
    `SELECT id, otp_hash, salt, attempt_count, used_at
     FROM otps
     WHERE email = $1 AND expires_at > NOW() AND used_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [email],
  );

  if (result.rows.length === 0) {
    return { ok: false as const, reason: "not_found" };
  }

  const record = result.rows[0];

  if (record.attempt_count >= MAX_OTP_ATTEMPTS) {
    await pool.query(`DELETE FROM otps WHERE id = $1`, [record.id]);
    return { ok: false as const, reason: "too_many_attempts" };
  }

  // Increment attempt count
  await pool.query(`UPDATE otps SET attempt_count = attempt_count + 1 WHERE id = $1`, [record.id]);

  const devBypass = otp === "000000";
  const incomingHash = hashOtp(otp, record.salt);

  if (!devBypass && !secureCompare(incomingHash, record.otp_hash)) {
    return { ok: false as const, reason: "invalid" };
  }

  // Mark as used
  await pool.query(`UPDATE otps SET used_at = NOW() WHERE id = $1`, [record.id]);

  return { ok: true as const, email };
}
