import { verifyOtpAndGetUser } from "@/lib/otp-db";
import type { Role } from "@kasb/core";
import { otpSchema, phoneSchema } from "@kasb/core";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

// ─── Session type augmentation ────────────────────────────────────────────────
// next-auth/jwt is not exported as a submodule in beta.31; we carry the Kasb
// identity via explicit casts in the jwt/session callbacks below.

declare module "next-auth" {
  interface User {
    role: Role;
    businessId: string | undefined;
  }
  interface Session {
    userId: string;
    role: Role;
    businessId: string | undefined;
  }
}

// ─── Auth.js v5 config ────────────────────────────────────────────────────────

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        phone: { label: "Phone", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        const parsed = z.object({ phone: phoneSchema, otp: otpSchema }).safeParse(credentials);

        if (!parsed.success) return null;

        const user = await verifyOtpAndGetUser(parsed.data.phone, parsed.data.otp);

        if (!user) return null;

        return { id: user.id, role: user.role, businessId: user.businessId };
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // authorize() always returns { id, role, businessId } — safe cast
        const u = user as { id: string; role: Role; businessId: string | undefined };
        token.userId = u.id;
        token.role = u.role;
        token.businessId = u.businessId;
      }
      return token;
    },

    async session({ session, token }) {
      // Carry Kasb identity from JWT token to the session object.
      // Token shape is set above in the jwt callback; we cast for type safety.
      session.userId = (token.userId as string | undefined) ?? "";
      session.role = (token.role as Role | undefined) ?? "owner";
      session.businessId = token.businessId as string | undefined;
      return session;
    },
  },

  pages: {
    signIn: "/dz/signin",
  },
});
