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
    partnerOrgId: string | undefined;
  }
  interface Session {
    userId: string;
    role: Role;
    businessId: string | undefined;
    partnerOrgId: string | undefined;
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

        return {
          id: user.id,
          role: user.role,
          businessId: user.businessId,
          partnerOrgId: user.partnerOrgId,
        };
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          id: string;
          role: Role;
          businessId: string | undefined;
          partnerOrgId: string | undefined;
        };
        token.userId = u.id;
        token.role = u.role;
        token.businessId = u.businessId;
        token.partnerOrgId = u.partnerOrgId;
      }
      return token;
    },

    async session({ session, token }) {
      session.userId = (token.userId as string | undefined) ?? "";
      session.role = (token.role as Role | undefined) ?? "owner";
      session.businessId = token.businessId as string | undefined;
      session.partnerOrgId = token.partnerOrgId as string | undefined;
      return session;
    },
  },

  pages: {
    signIn: "/dz/signin",
  },
});
