import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getSession } from "@/lib/session-store";

export type SummaryRow = {
  cafe_name: string;
  category: string;
  total_value: string;
  has_missing_price: boolean;
};

export async function GET(request: NextRequest) {
  const token = request.cookies.get("wmu_inventory_session")?.value;
  const session = await getSession(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin" && session.role !== "commissary") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "from and to date params are required." }, { status: 400 });
  }

  const pool = getDbPool();

  const result = await pool.query<{
    cafe_name: string;
    category: string;
    total_value: string;
    has_missing_price: boolean;
  }>(
    `SELECT
       COALESCE(c.name, 'Unknown') AS cafe_name,
       i.category,
       COALESCE(SUM(srl.fulfilled_qty * ip.price_per_unit), 0)::numeric(12,2)::text AS total_value,
       BOOL_OR(ip.price_per_unit IS NULL) AS has_missing_price
     FROM stock_requests sr
     JOIN stock_request_lines srl ON srl.stock_request_id = sr.id
     JOIN items i ON i.id = srl.item_id
     LEFT JOIN item_prices ip ON ip.item_id = i.id AND ip.effective_to IS NULL
     LEFT JOIN cafes c ON c.id = sr.cafe_id
     WHERE sr.status IN ('fulfilled', 'partially_fulfilled')
       AND sr.fulfilled_at >= $1::date
       AND sr.fulfilled_at < ($2::date + INTERVAL '1 day')
       AND srl.fulfilled_qty IS NOT NULL
       AND srl.fulfilled_qty > 0
     GROUP BY c.name, i.category
     ORDER BY c.name ASC, i.category ASC`,
    [from, to],
  );

  return NextResponse.json({ rows: result.rows }, { status: 200 });
}
