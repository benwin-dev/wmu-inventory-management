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
      `
      WITH target AS (
        SELECT id FROM items WHERE sku = $1
      )
      DELETE FROM inventory_balances WHERE item_id IN (SELECT id FROM target);
      `,
      [sku],
    );

    await pool.query(
      `
      WITH target AS (
        SELECT id FROM items WHERE sku = $1
      )
      DELETE FROM item_prices WHERE item_id IN (SELECT id FROM target);
      `,
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
