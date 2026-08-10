import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getSession } from "@/lib/session-store";

type InventoryRow = {
  id: number;
  sku: string;
  item_name: string;
  unit_type: string;
  case_size: string | null;
  units_per_case: string | null;
  on_hand_qty: string;
  case_price: string | null;
  unit_price: string | null;
  description: string | null;
  category: string;
};

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("wmu_inventory_session")?.value;
    const session = await getSession(token);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pool = getDbPool();

    const result = await pool.query<InventoryRow>(
      `
      SELECT
        i.id,
        i.sku,
        i.name AS item_name,
        i.description,
        i.unit_type,
        i.category,
        i.case_size,
        i.units_per_case::text,
        COALESCE(b.on_hand_qty, 0)::text AS on_hand_qty,
        (
          SELECT ip.case_price::text
          FROM item_prices ip
          WHERE ip.item_id = i.id
            AND ip.effective_to IS NULL
          ORDER BY ip.effective_from DESC
          LIMIT 1
        ) AS case_price,
        (
          SELECT ip.price_per_unit::text
          FROM item_prices ip
          WHERE ip.item_id = i.id
            AND ip.effective_to IS NULL
          ORDER BY ip.effective_from DESC
          LIMIT 1
        ) AS unit_price
      FROM items i
      LEFT JOIN inventory_locations l ON l.code = 'COMMISSARY'
      LEFT JOIN inventory_balances b ON b.item_id = i.id AND b.location_id = l.id
      WHERE i.active = TRUE
      ORDER BY i.created_at ASC
      `,
    );

    // Separate query for cafe visibility
    const visibilityMap = new Map<number, number[]>();
    try {
      const visResult = await pool.query(`SELECT item_id, cafe_id FROM item_cafe_visibility`);
      for (const row of visResult.rows) {
        const itemId = Number(row.item_id);
        const existing = visibilityMap.get(itemId) ?? [];
        existing.push(Number(row.cafe_id));
        visibilityMap.set(itemId, existing);
      }
    } catch (visErr) {
      console.error("[master] item_cafe_visibility query failed:", visErr);
    }

    // Separate query for tags
    const tagsMap = new Map<number, number[]>();
    try {
      const tagsResult = await pool.query(`SELECT item_id, tag_id FROM item_tags`);
      for (const row of tagsResult.rows) {
        const itemId = Number(row.item_id);
        const existing = tagsMap.get(itemId) ?? [];
        existing.push(Number(row.tag_id));
        tagsMap.set(itemId, existing);
      }
    } catch (tagErr) {
      console.error("[master] item_tags query failed:", tagErr);
    }

    const items = result.rows.map(({ id, ...item }) => ({
      ...item,
      cafe_ids: visibilityMap.get(Number(id)) ?? [],
      tag_ids: tagsMap.get(Number(id)) ?? [],
    }));

    return NextResponse.json(
      { location: "Commissary", count: items.length, items },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to load master inventory", error);
    return NextResponse.json({ error: "Unable to load inventory right now." }, { status: 500 });
  }
}
