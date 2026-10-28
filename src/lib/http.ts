import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { AppError } from "./errors";
export async function apiUser(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(process.env.AUTH_URL ?? req.url).origin)
    throw new AppError("Geçersiz istek kaynağı.", 403);
  const session = await auth();
  if (!session?.user?.id)
    throw new AppError("Devam etmek için giriş yapın.", 401);
  return session.user.id;
}
export async function jsonBody(req: NextRequest) {
  if (Number(req.headers.get("content-length") ?? 0) > 32000)
    throw new AppError("İstek çok büyük.", 413);
  try {
    const body = await req.text();
    if (body.length > 32000) throw new AppError("İstek çok büyük.", 413);
    return JSON.parse(body);
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError("Geçersiz JSON.");
  }
}
export function fail(e: unknown) {
  if (e instanceof AppError)
    return NextResponse.json({ error: e.message }, { status: e.status });
  if (e instanceof ZodError)
    return NextResponse.json(
      { error: e.issues[0]?.message ?? "Bilgileri kontrol edin." },
      { status: 400 },
    );
  const code = (e as { code?: string })?.code;
  if (["P2002", "P2004", "P2034", "23P01", "23505"].includes(code ?? ""))
    return NextResponse.json(
      {
        error:
          "Bu işlem başka bir kayıtla çakıştı. Sayfayı yenileyip tekrar deneyin.",
      },
      { status: 409 },
    );
  console.error("API error", e);
  return NextResponse.json(
    { error: "İşlem tamamlanamadı. Lütfen tekrar deneyin." },
    { status: 500 },
  );
}
