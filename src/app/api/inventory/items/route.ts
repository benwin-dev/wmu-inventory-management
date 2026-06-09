import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getSession } from "@/lib/session-store";

function generateSku(name: string): string {
  return name
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("wmu_inventory_session")?.value;
    const session = getSession(token);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      name?: string;
      unit_type?: string;
      units_per_case?: number | null;
      case_price?: number | null;
      unit_price?: number | null;
      on_hand_qty?: number;
    };

    const name = body.name?.trim();
    const unit_type = body.unit_type?.trim() || "each";
    const units_per_case = body.units_per_case ?? null;
    const case_price = body.case_price ?? null;
    const unit_price = body.unit_price ?? null;
    const on_hand_qty = body.on_hand_qty ?? 0;

    if (!name) {
      return NextResponse.json({ error: "Item name is required." }, { status: 400 });
    }

    const pool = getDbPool();

    // Generate a unique SKU — append a counter if there's a collision
    let sku = generateSku(name);
    const existing = await pool.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM items WHERE sku LIKE $1",
      [`${sku}%`],
    );
    const count = parseInt(existing.rows[0]?.count ?? "0", 10);
    if (count > 0) {
      sku = `${sku}-${count + 1}`;
    }

    // Insert item, prices, and balance in one transaction
    const result = await pool.query(
      `
      WITH inserted_item AS (
        INSERT INTO items (sku, name, unit_type, units_per_case, active)
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING id, sku, name, unit_type, units_per_case
      ),
      inserted_price AS (
        INSERT INTO item_prices (item_id, price_per_unit, case_price, effective_from)
        SELECT id, $5::numeric, $6::numeric, CURRENT_DATE FROM inserted_item
        WHERE $5::numeric IS NOT NULL OR $6::numeric IS NOT NULL
        RETURNING item_id, price_per_unit, case_price
      ),
      inserted_balance AS (
        INSERT INTO inventory_balances (location_id, item_id, on_hand_qty)
        SELECT l.id, i.id, $7
        FROM inserted_item i
        JOIN inventory_locations l ON l.code = 'COMMISSARY'
        RETURNING on_hand_qty
      )
      SELECT
        i.sku,
        i.name AS item_name,
        i.unit_type,
        i.units_per_case::text,
        NULL AS case_size,
        COALESCE(b.on_hand_qty, 0)::text AS on_hand_qty,
        p.case_price::text,
        p.price_per_unit::text AS unit_price
      FROM inserted_item i
      LEFT JOIN inserted_price p ON p.item_id = i.id
      LEFT JOIN inserted_balance b ON TRUE
      `,
      [sku, name, unit_type, units_per_case, unit_price, case_price, on_hand_qty],
    );

    return NextResponse.json({ item: result.rows[0] }, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create item", error);
    return NextResponse.json({ error: "Unable to add item right now." }, { status: 500 });
  }
}
