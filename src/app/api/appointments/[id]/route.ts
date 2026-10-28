import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonBody, fail } from "@/lib/http";
import { changeAppointment } from "@/lib/reservations";
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await apiUser(req);
    const input = z
      .object({
        action: z.enum(["CANCELLED", "COMPLETED", "NO_SHOW"]),
        reason: z.string().max(500).default(""),
        banDays: z.number().int().optional(),
      })
      .parse(await jsonBody(req));
    return NextResponse.json(
      await changeAppointment(
        user,
        (await params).id,
        input.action,
        input.reason,
        input.banDays,
      ),
    );
  } catch (e) {
    return fail(e);
  }
}
