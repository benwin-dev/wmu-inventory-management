import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getSession } from "@/lib/session-store";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = request.cookies.get("wmu_inventory_session")?.value;
    const session = getSession(token);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const requestId = parseInt(id, 10);

    if (isNaN(requestId)) {
      return NextResponse.json({ error: "Invalid request ID." }, { status: 400 });
    }

    const pool = getDbPool();

    await pool.query(`DELETE FROM stock_request_lines WHERE stock_request_id = $1`, [requestId]);
    const result = await pool.query(`DELETE FROM stock_requests WHERE id = $1 RETURNING id`, [requestId]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete request", error);
    return NextResponse.json({ error: "Unable to delete request right now." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = request.cookies.get("wmu_inventory_session")?.value;
    const session = getSession(token);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const requestId = parseInt(id, 10);

    if (isNaN(requestId)) {
      return NextResponse.json({ error: "Invalid request ID." }, { status: 400 });
    }

    const pool = getDbPool();

    // Deduct each line's requested_qty from inventory_balances at COMMISSARY
    await pool.query(
      `UPDATE inventory_balances ib
       SET on_hand_qty = ib.on_hand_qty - srl.requested_qty,
           updated_at = NOW()
       FROM stock_request_lines srl
       JOIN inventory_locations l ON l.code = 'COMMISSARY'
       WHERE srl.stock_request_id = $1
         AND ib.item_id = srl.item_id
         AND ib.location_id = l.id`,
      [requestId],
    );

    // Mark request as fulfilled
    const result = await pool.query(
      `UPDATE stock_requests
       SET status = 'fulfilled', updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [requestId],
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to fulfill request", error);
    return NextResponse.json({ error: "Unable to fulfill request right now." }, { status: 500 });
  }
}
