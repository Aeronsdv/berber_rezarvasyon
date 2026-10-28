import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
export const googleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);
export const devLoginEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.AUTH_DEV_LOGIN === "true";
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/giris", error: "/giris" },
  providers: [
    ...(googleEnabled ? [Google] : []),
    ...(devLoginEnabled
      ? [
          Credentials({
            id: "dev",
            credentials: { email: {}, name: {} },
            async authorize(raw) {
              const email = String(raw.email ?? "")
                .trim()
                .toLowerCase();
              if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
                email.length > 200
              )
                return null;
              return db.user.upsert({
                where: { email },
                update: {},
                create: {
                  email,
                  name: String(raw.name || email.split("@")[0]).slice(0, 80),
                },
              });
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
