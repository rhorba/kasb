import { getMyProfile } from "@/actions/business-profile";
import { auth, signOut } from "@/auth";
import { PushToggle } from "@/components/push-toggle";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const [t, ta, session, profileResult] = await Promise.all([
    getTranslations("profile"),
    getTranslations("auth"),
    auth(),
    getMyProfile(),
  ]);

  const existing = profileResult.ok ? profileResult.data : null;
  const isCreating = !existing;

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="text-xl font-bold text-kasb-500">
          {isCreating ? t("createTitle") : t("title")}
        </h1>
        {session?.userId && <p className="mt-1 text-xs text-gray-400">{session.userId}</p>}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <ProfileForm existing={existing} />
      </div>

      {/* Quick links */}
      {existing && (
        <div className="flex flex-col gap-2">
          <Link
            href="/ae"
            className="flex h-14 items-center justify-between rounded-2xl border border-kasb-200 bg-kasb-50 px-4 text-sm font-semibold text-kasb-700 active:bg-kasb-100"
          >
            <span>🏛 Auto-Entrepreneur — Guide</span>
            <span className="text-kasb-400">→</span>
          </Link>
          <Link
            href="/stock"
            className="flex h-14 items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm active:bg-gray-50"
          >
            <span>📦 Suivi des Stocks</span>
            <span className="text-gray-400">→</span>
          </Link>
          <PushToggle />
        </div>
      )}

      {/* Sign out */}
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/signin" });
        }}
      >
        <button
          type="submit"
          className="flex h-14 w-full items-center justify-center rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 active:scale-95"
        >
          {ta("signOut")}
        </button>
      </form>
    </div>
  );
}
