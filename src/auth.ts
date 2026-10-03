import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
export const devLoginEnabled =
  process.env.AUTH_DEV_LOGIN === "true" && process.env.NODE_ENV !== "production";

const providers: Provider[] = [];

if (googleEnabled) providers.push(Google({ allowDangerousEmailAccountLinking: true }));

if (devLoginEnabled) {
  // Yalnızca geliştirme ortamı: Google anahtarları olmadan sistemi test etmek için.
  providers.push(
    Credentials({
      id: "dev",
      name: "Geliştirici girişi",
      credentials: { email: {}, name: {} },
      async authorize(raw) {
        const email = String(raw?.email ?? "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
        const name = String(raw?.name ?? "").trim() || email.split("@")[0];
        return db.user.upsert({
          where: { email },
          update: {},
          create: { email, name },
        });
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db as unknown as Parameters<typeof PrismaAdapter>[0]),
  session: { strategy: "jwt" },
  providers,
  pages: { signIn: "/giris" },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub && session.user) session.user.id = token.sub;
      return session;
    },
  },
});
