import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware navigation utilities — use these instead of next/link, next/navigation
// directly so locale prefix is handled automatically.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
