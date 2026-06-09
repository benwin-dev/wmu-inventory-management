import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getSession } from "@/lib/session-store";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sku: string }> },
) {
  try {
    const token = request.cookies.get("wmu_inventory_session")?.value;
    const session = getSession(token);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sku } = await params;

    if (!sku) {
      return NextResponse.json({ error: "SKU is required." }, { status: 400 });
    }

    const pool = getDbPool();

    await pool.query(
      `WITH target AS (SELECT id FROM items WHERE sku = $1)
       DELETE FROM inventory_balances WHERE item_id IN (SELECT id FROM target)`,
      [sku],
    );

    await pool.query(
      `WITH target AS (SELECT id FROM items WHERE sku = $1)
       DELETE FROM item_prices WHERE item_id IN (SELECT id FROM target)`,
      [sku],
    );

    const result = await pool.query(
      `DELETE FROM items WHERE sku = $1 RETURNING sku`,
      [sku],
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete item", error);
    return NextResponse.json({ error: "Unable to delete item right now." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sku: string }> },
) {
  try {
    const token = request.cookies.get("wmu_inventory_session")?.value;
    const session = getSession(token);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sku } = await params;
    const body = (await request.json()) as {
      name?: string;
      unit_type?: string;
      units_per_case?: number | null;
      case_price?: number | null;
      unit_price?: number | null;
      on_hand_qty?: number;
    };

    const pool = getDbPool();

    // Update items table
    await pool.query(
      `UPDATE items
       SET name = $1, unit_type = $2, units_per_case = $3, updated_at = NOW()
       WHERE sku = $4`,
      [body.name, body.unit_type, body.units_per_case ?? null, sku],
    );

    // Update current price row (effective_to IS NULL)
    await pool.query(
      `UPDATE item_prices
       SET price_per_unit = $1::numeric, case_price = $2::numeric, updated_at = NOW()
       WHERE item_id = (SELECT id FROM items WHERE sku = $3)
         AND effective_to IS NULL`,
      [body.unit_price ?? null, body.case_price ?? null, sku],
    );

    // Update on-hand balance
    await pool.query(
      `UPDATE inventory_balances
       SET on_hand_qty = $1, updated_at = NOW()
       WHERE item_id = (SELECT id FROM items WHERE sku = $2)
         AND location_id = (SELECT id FROM inventory_locations WHERE code = 'COMMISSARY')`,
      [body.on_hand_qty ?? 0, sku],
    );

    // Return updated row
    const result = await pool.query(
      `SELECT
         i.sku,
         i.name AS item_name,
         i.unit_type,
         i.units_per_case::text,
         NULL AS case_size,
         COALESCE(b.on_hand_qty, 0)::text AS on_hand_qty,
         ip.case_price::text,
         ip.price_per_unit::text AS unit_price
       FROM items i
       LEFT JOIN inventory_locations l ON l.code = 'COMMISSARY'
       LEFT JOIN inventory_balances b ON b.item_id = i.id AND b.location_id = l.id
       LEFT JOIN item_prices ip ON ip.item_id = i.id AND ip.effective_to IS NULL
       WHERE i.sku = $1`,
      [sku],
    );

    return NextResponse.json({ item: result.rows[0] }, { status: 200 });
  } catch (error) {
    console.error("Failed to update item", error);
    return NextResponse.json({ error: "Unable to update item right now." }, { status: 500 });
  }
}
