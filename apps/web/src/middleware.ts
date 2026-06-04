import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Auth middleware (S0-07) will be chained here by Security Engineer.
// For now: intl routing only. Protected routes are guarded in individual layouts.
export default createMiddleware(routing);

export const config = {
  // Match all paths except Next.js internals, static files, and API routes
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
