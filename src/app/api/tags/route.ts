import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getSession } from "@/lib/session-store";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("wmu_inventory_session")?.value;
  const session = await getSession(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pool = getDbPool();
  const result = await pool.query<{ id: number; name: string; slug: string }>(
    `SELECT id, name, slug FROM tags ORDER BY name ASC`,
  );
  return NextResponse.json({ tags: result.rows }, { status: 200 });
}
