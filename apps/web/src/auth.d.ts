import type { Role } from "@kasb/core";

// Extend next-auth types so the JWT and Session carry Kasb identity.
// Mirrors KasbSession from @kasb/core — businessId required but can be undefined.

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

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: Role;
    businessId: string | undefined;
  }
}
