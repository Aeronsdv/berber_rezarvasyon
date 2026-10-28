import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "./db";
export const currentUser = cache(async () => {
  const session = await auth();
  return session?.user?.id
    ? db.user.findUnique({
        where: { id: session.user.id },
        include: { shops: { orderBy: { createdAt: "asc" } } },
      })
    : null;
});
export async function requireUser(path = "/panel") {
  const user = await currentUser();
  if (!user) redirect(`/giris?callbackUrl=${encodeURIComponent(path)}`);
  return user;
}
