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
