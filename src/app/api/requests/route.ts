import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getSession } from "@/lib/session-store";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("wmu_inventory_session")?.value;
    const session = getSession(token);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      items: { sku: string; qty: number }[];
      notes?: string;
    };

    const lines = (body.items ?? []).filter((l) => l.qty > 0);
    const notes = body.notes?.trim() || null;

    if (lines.length === 0) {
      return NextResponse.json({ error: "Add at least one item to your request." }, { status: 400 });
    }

    const pool = getDbPool();

    // Create the stock request for Parkview
    const reqResult = await pool.query<{ id: number }>(
      `INSERT INTO stock_requests (cafe_id, request_date, status, submitted_by, submitted_at, notes)
       SELECT id, CURRENT_DATE, 'submitted', $1, NOW(), $2
       FROM cafes WHERE code = 'PARKVIEW'
       RETURNING id`,
      [session.email, notes],
    );

    const requestId = reqResult.rows[0].id;

    // Insert request lines
    for (const line of lines) {
      await pool.query(
        `INSERT INTO stock_request_lines (stock_request_id, item_id, requested_qty)
         SELECT $1, id, $2 FROM items WHERE sku = $3`,
        [requestId, line.qty, line.sku],
      );
    }

    return NextResponse.json({ ok: true, requestId }, { status: 201 });
  } catch (error) {
    console.error("Failed to submit request", error);
    return NextResponse.json({ error: "Unable to submit request right now." }, { status: 500 });
  }
}
