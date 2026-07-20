import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getSession } from "@/lib/session-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = request.cookies.get("wmu_inventory_session")?.value;
    const session = getSession(token);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const requestId = parseInt(id, 10);
    if (isNaN(requestId)) return NextResponse.json({ error: "Invalid request ID." }, { status: 400 });

    const pool = getDbPool();

    const reqResult = await pool.query<{
      id: number;
      submitted_at: string;
      fulfilled_at: string | null;
      recorded_at: string | null;
      submitted_by: string;
      fulfilled_by: string | null;
      recorded_by: string | null;
      requested_by_name: string | null;
      fulfilled_by_name: string | null;
      recorded_by_name: string | null;
      cafe_name: string;
      status: string;
      notes: string | null;
      fulfillment_notes: string | null;
    }>(
      `SELECT
         sr.id,
         sr.submitted_at,
         sr.fulfilled_at,
         sr.recorded_at,
         sr.submitted_by,
         sr.fulfilled_by,
         sr.recorded_by,
         sr.requested_by_name,
         sr.fulfilled_by_name,
         sr.recorded_by_name,
         COALESCE(c.name, 'Unknown') AS cafe_name,
         sr.status,
         sr.notes,
         sr.fulfillment_notes
       FROM stock_requests sr
       LEFT JOIN cafes c ON c.id = sr.cafe_id
       WHERE sr.id = $1`,
      [requestId],
    );

    if (reqResult.rows.length === 0) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    const req = reqResult.rows[0];

    const lineResult = await pool.query<{
      sku: string;
      item_name: string;
      unit_type: string;
      requested_qty: string;
      fulfilled_qty: string | null;
      unit_price: string | null;
    }>(
      `SELECT
         i.sku,
         i.name AS item_name,
         i.unit_type,
         srl.requested_qty::text,
         srl.fulfilled_qty::text,
         (
           SELECT ip.price_per_unit::text
           FROM item_prices ip
           WHERE ip.item_id = i.id AND ip.effective_to IS NULL
           ORDER BY ip.effective_from DESC
           LIMIT 1
         ) AS unit_price
       FROM stock_request_lines srl
       JOIN items i ON i.id = srl.item_id
       WHERE srl.stock_request_id = $1
       ORDER BY srl.id ASC`,
      [requestId],
    );

    return NextResponse.json({ request: req, lines: lineResult.rows }, { status: 200 });
  } catch (error) {
    console.error("Failed to load receipt", error);
    return NextResponse.json({ error: "Unable to load receipt right now." }, { status: 500 });
  }
}
