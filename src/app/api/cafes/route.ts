import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getSession } from "@/lib/session-store";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("wmu_inventory_session")?.value;
    const session = await getSession(token);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const pool = getDbPool();
    const result = await pool.query<{ id: number; code: string; name: string }>(
      `SELECT id, code, name FROM cafes WHERE active = TRUE ORDER BY name ASC`,
    );

    return NextResponse.json({ cafes: result.rows }, { status: 200 });
  } catch (error) {
    console.error("Failed to load cafes", error);
    return NextResponse.json({ error: "Unable to load cafes." }, { status: 500 });
  }
}
