import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getSession } from "@/lib/session-store";

type InventoryRow = {
  sku: string;
  item_name: string;
  unit_type: string;
  case_size: string | null;
  on_hand_qty: string;
  case_price: string | null;
  unit_price: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("wmu_inventory_session")?.value;
    const session = getSession(token);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pool = getDbPool();
    const result = await pool.query<InventoryRow>(
      `
      SELECT
        i.sku,
        i.name AS item_name,
        i.unit_type,
        i.case_size,
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
      LEFT JOIN inventory_locations l
        ON l.code = 'COMMISSARY'
      LEFT JOIN inventory_balances b
        ON b.item_id = i.id
       AND b.location_id = l.id
      WHERE i.active = TRUE
      ORDER BY i.name ASC
      `,
    );

    return NextResponse.json(
      {
        location: "Commissary",
        count: result.rowCount ?? 0,
        items: result.rows,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to load master inventory", error);
    return NextResponse.json({ error: "Unable to load inventory right now." }, { status: 500 });
  }
}
