import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getSession } from "@/lib/session-store";

type ValidationIssue = {
  sku: string;
  item_name: string;
  requested_qty: number;
  on_hand_qty: number;
};

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("wmu_inventory_session")?.value;
    const session = await getSession(token);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      items: { sku: string; qty: number }[];
    };

    const items = (body.items ?? []).filter((l) => l.qty > 0);

    if (items.length === 0) {
      return NextResponse.json({ issues: [] }, { status: 200 });
    }

    const pool = getDbPool();
    const skus = items.map((i) => i.sku);

    const result = await pool.query<{
      sku: string;
      item_name: string;
      on_hand_qty: string;
    }>(
      `SELECT i.sku, i.name AS item_name, COALESCE(b.on_hand_qty, 0)::text AS on_hand_qty
       FROM items i
       LEFT JOIN inventory_locations l ON l.code = 'COMMISSARY'
       LEFT JOIN inventory_balances b ON b.item_id = i.id AND b.location_id = l.id
       WHERE i.sku = ANY($1)`,
      [skus],
    );

    const stockMap = new Map(
      result.rows.map((r) => [r.sku, { item_name: r.item_name, on_hand_qty: parseFloat(r.on_hand_qty) }]),
    );

    const issues: ValidationIssue[] = items
      .filter((item) => {
        const stock = stockMap.get(item.sku);
        return !stock || item.qty > stock.on_hand_qty;
      })
      .map((item) => {
        const stock = stockMap.get(item.sku);
        return {
          sku: item.sku,
          item_name: stock?.item_name ?? item.sku,
          requested_qty: item.qty,
          on_hand_qty: stock?.on_hand_qty ?? 0,
        };
      });

    return NextResponse.json({ issues }, { status: 200 });
  } catch (error) {
    console.error("Failed to validate request", error);
    return NextResponse.json({ error: "Unable to validate request right now." }, { status: 500 });
  }
}
