import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { availability } from "@/lib/reservations";
import { fail } from "@/lib/http";
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const result = await availability(
      Object.fromEntries(req.nextUrl.searchParams),
      session?.user?.id,
    );
    return NextResponse.json(
      {
        slots: result.slots.map((s) => ({ startMin: s.startMin })),
        closed: result.closed,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return fail(e);
  }
}
