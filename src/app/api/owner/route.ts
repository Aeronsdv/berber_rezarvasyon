import { NextRequest, NextResponse } from "next/server";
import { apiUser, jsonBody, fail } from "@/lib/http";
import { createShop } from "@/lib/owner";
export async function POST(req: NextRequest) {
  try {
    const user = await apiUser(req);
    return NextResponse.json(await createShop(user, await jsonBody(req)), {
      status: 201,
    });
  } catch (e) {
    return fail(e);
  }
}
