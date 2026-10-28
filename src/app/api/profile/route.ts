import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonBody, fail } from "@/lib/http";
import { db } from "@/lib/db";
export async function PATCH(req: NextRequest) {
  try {
    const id = await apiUser(req);
    const data = z
      .object({
        phone: z
          .string()
          .regex(/^\+?[\d\s()-]{10,20}$/, "Geçerli bir telefon girin."),
      })
      .parse(await jsonBody(req));
    await db.user.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
