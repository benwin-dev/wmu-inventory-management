import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { requireRole } from "@/lib/require-role";

export async function GET(request: NextRequest) {
  const { session, error } = requireRole(request, ["admin"]);
  if (error) return error;
  void session;

  const pool = getDbPool();
  const result = await pool.query<{ id: number; email: string; role: string; created_at: string }>(
    `SELECT id, email, role, created_at FROM user_roles ORDER BY created_at ASC`,
  );
  return NextResponse.json({ users: result.rows }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const { session, error } = requireRole(request, ["admin"]);
  if (error) return error;
  void session;

  const body = (await request.json()) as { email?: string; role?: string };
  const email = body.email?.trim().toLowerCase();
  const role = body.role?.trim();

  if (!email || !role) {
    return NextResponse.json({ error: "Email and role are required." }, { status: 400 });
  }

  const validRoles = ["admin", "commissary", "cafe", "driver"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  if (!email.endsWith("@wmich.edu")) {
    return NextResponse.json({ error: "Only @wmich.edu emails are allowed." }, { status: 400 });
  }

  const pool = getDbPool();
  try {
    const result = await pool.query<{ id: number; email: string; role: string; created_at: string }>(
      `INSERT INTO user_roles (email, role) VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
       RETURNING id, email, role, created_at`,
      [email, role],
    );
    return NextResponse.json({ user: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error("Failed to add user", err);
    return NextResponse.json({ error: "Unable to add user right now." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { session, error } = requireRole(request, ["admin"]);
  if (error) return error;

  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email) return NextResponse.json({ error: "Email required." }, { status: 400 });

  // Protect the seeded admin
  if (email === "benwin.george@wmich.edu") {
    return NextResponse.json({ error: "Cannot remove the primary admin account." }, { status: 403 });
  }

  // Prevent self-removal
  if (email === session!.email) {
    return NextResponse.json({ error: "You cannot remove your own access." }, { status: 403 });
  }

  const pool = getDbPool();
  await pool.query(`DELETE FROM user_roles WHERE email = $1`, [email]);
  return NextResponse.json({ ok: true }, { status: 200 });
}
