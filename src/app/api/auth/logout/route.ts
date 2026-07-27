import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/session-store";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("wmu_inventory_session")?.value;
  await deleteSession(token);

  const response = NextResponse.json({ ok: true }, { status: 200 });

  response.cookies.set({
    name: "wmu_inventory_session",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });

  return response;
}
