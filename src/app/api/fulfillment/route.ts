import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getSession } from "@/lib/session-store";

type RequestLine = {
  sku: string;
  item_name: string;
  unit_type: string;
  requested_qty: string;
  fulfilled_qty: string | null;
  unit_price: string | null;
};

type StockRequest = {
  id: number;
  submitted_at: string;
  submitted_by: string;
  requested_by_name: string | null;
  fulfilled_by: string | null;
  fulfilled_by_name: string | null;
  recorded_by: string | null;
  recorded_by_name: string | null;
  cafe_name: string;
  status: string;
  item_count: string;
  notes: string | null;
  fulfillment_notes: string | null;
  lines: RequestLine[];
};

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("wmu_inventory_session")?.value;
    const session = getSession(token);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pool = getDbPool();

    // Fetch all requests with cafe name and item count
    const reqResult = await pool.query<Omit<StockRequest, "lines">>(
      `SELECT
         sr.id,
         sr.submitted_at,
         sr.submitted_by,
         sr.requested_by_name,
         sr.fulfilled_by,
         sr.fulfilled_by_name,
         sr.recorded_by,
         sr.recorded_by_name,
         COALESCE(c.name, 'Unknown') AS cafe_name,
         sr.status,
         sr.notes,
         sr.fulfillment_notes,
         COUNT(srl.id)::text AS item_count
       FROM stock_requests sr
       LEFT JOIN cafes c ON c.id = sr.cafe_id
       LEFT JOIN stock_request_lines srl ON srl.stock_request_id = sr.id
       GROUP BY sr.id, sr.submitted_at, sr.submitted_by, sr.requested_by_name, sr.fulfilled_by, sr.fulfilled_by_name, sr.recorded_by, sr.recorded_by_name, c.name, sr.status, sr.notes, sr.fulfillment_notes
       ORDER BY sr.submitted_at DESC`,
    );

    // Fetch line items for all requests
    const lineResult = await pool.query<RequestLine & { stock_request_id: number }>(
      `SELECT
         srl.stock_request_id,
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
       ORDER BY srl.id ASC`,
    );

    // Group lines by request id
    const linesByRequest = lineResult.rows.reduce<Record<number, RequestLine[]>>((acc, row) => {
      const { stock_request_id, ...line } = row;
      if (!acc[stock_request_id]) acc[stock_request_id] = [];
      acc[stock_request_id].push(line);
      return acc;
    }, {});

    const requests: StockRequest[] = reqResult.rows.map((r) => ({
      ...r,
      lines: linesByRequest[r.id] ?? [],
    }));

    return NextResponse.json({ requests }, { status: 200 });
  } catch (error) {
    console.error("Failed to load fulfillment queue", error);
    return NextResponse.json({ error: "Unable to load requests right now." }, { status: 500 });
  }
}
