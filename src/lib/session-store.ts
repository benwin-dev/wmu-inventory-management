import crypto from "crypto";
import { getDbPool } from "@/lib/db";

const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

export type UserRole = "admin" | "commissary" | "cafe" | "driver";

export type SessionRecord = {
  email: string;
  role: UserRole;
  cafe_id: number | null;
};

export async function createSession(email: string, role: UserRole = "cafe", cafe_id: number | null = null) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);

  const pool = getDbPool();
  await pool.query(
    `INSERT INTO sessions (token, email, role, cafe_id, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [token, email, role, cafe_id, expiresAt],
  );

  return {
    token,
    maxAgeSec: Math.floor(SESSION_MAX_AGE_MS / 1000),
  };
}

export async function getSession(token?: string): Promise<SessionRecord | null> {
  if (!token) return null;

  const pool = getDbPool();
  const result = await pool.query<{ email: string; role: string; cafe_id: number | null }>(
    `SELECT email, role, cafe_id FROM sessions WHERE token = $1 AND expires_at > NOW()`,
    [token],
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    email: row.email,
    role: row.role as UserRole,
    cafe_id: row.cafe_id ?? null,
  };
}

export async function deleteSession(token?: string) {
  if (!token) return;
  const pool = getDbPool();
  await pool.query(`DELETE FROM sessions WHERE token = $1`, [token]);
}

export async function updateSessionRole(token: string, role: UserRole) {
  const pool = getDbPool();
  const result = await pool.query(
    `UPDATE sessions SET role = $1 WHERE token = $2 AND expires_at > NOW()`,
    [role, token],
  );
  return (result.rowCount ?? 0) > 0;
}
