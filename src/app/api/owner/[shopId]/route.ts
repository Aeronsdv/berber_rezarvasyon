import { NextRequest, NextResponse } from "next/server";
import { apiUser, jsonBody, fail } from "@/lib/http";
import { manageShop } from "@/lib/owner";
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shopId: string }> },
) {
  try {
    const user = await apiUser(req);
    return NextResponse.json(
      await manageShop(user, (await params).shopId, await jsonBody(req)),
    );
  } catch (e) {
    return fail(e);
  }
}
