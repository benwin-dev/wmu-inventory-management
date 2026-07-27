import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session-store";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("wmu_inventory_session")?.value;
  const session = getSession(token);

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, email: session.email, role: session.role, cafe_id: session.cafe_id ?? null }, { status: 200 });
}
