import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonBody, fail } from "@/lib/http";
import { db } from "@/lib/db";
export async function POST(req: NextRequest) {
  try {
    const userId = await apiUser(req);
    const { barbershopId, saved } = z
      .object({ barbershopId: z.string().min(1).max(100), saved: z.boolean() })
      .parse(await jsonBody(req));
    if (saved)
      await db.favorite.upsert({
        where: { userId_barbershopId: { userId, barbershopId } },
        create: { userId, barbershopId },
        update: {},
      });
    else await db.favorite.deleteMany({ where: { userId, barbershopId } });
    return NextResponse.json({ saved });
  } catch (e) {
    return fail(e);
  }
}
