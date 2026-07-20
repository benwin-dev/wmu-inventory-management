import { NextRequest, NextResponse } from "next/server";
import { getSession, UserRole } from "./session-store";

export function requireRole(request: NextRequest, allowed: UserRole[]) {
  const token = request.cookies.get("wmu_inventory_session")?.value;
  const session = getSession(token);

  if (!session) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!allowed.includes(session.role)) {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session, error: null };
}
