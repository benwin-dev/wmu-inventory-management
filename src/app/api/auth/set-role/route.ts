import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSessionRole } from "@/lib/session-store";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("wmu_inventory_session")?.value;
    const session = getSession(token);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as { role?: string };
    const role = body.role === "commissary" ? "commissary" : "cafe";

    updateSessionRole(token!, role);

    return NextResponse.json({ ok: true, role }, { status: 200 });
  } catch (error) {
    console.error("Failed to set role", error);
    return NextResponse.json({ error: "Unable to set role right now." }, { status: 500 });
  }
}
