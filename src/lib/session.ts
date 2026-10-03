import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

/** Oturumdaki kullanıcıyı veritabanından getirir (istek başına önbellekli). */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return db.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, image: true, phone: true, shop: { select: { id: true, slug: true, name: true } } },
  });
});

export async function requireUser(callbackUrl = "/") {
  const user = await getCurrentUser();
  if (!user) redirect(`/giris?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return user;
}

/** Dükkan sahibini ve dükkanını döndürür; dükkan yoksa kuruluma yönlendirir. */
export async function requireShop() {
  const user = await requireUser("/panel");
  if (!user.shop) redirect("/panel/kurulum");
  return { user, shop: user.shop };
}
