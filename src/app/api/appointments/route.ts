import { NextRequest, NextResponse } from "next/server";
import { apiUser, jsonBody, fail } from "@/lib/http";
import { book } from "@/lib/reservations";
export async function POST(req: NextRequest) {
  try {
    const user = await apiUser(req);
    return NextResponse.json(await book(user, await jsonBody(req)), {
      status: 201,
    });
  } catch (e) {
    return fail(e);
  }
}
