import { auth, signOut } from "@/auth";
import { getTranslations } from "next-intl/server";

export default async function ProfilePage() {
  const [t, session] = await Promise.all([getTranslations("profile"), auth()]);

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="text-xl font-bold text-kasb-500">{t("title")}</h1>

      {/* Session info — Sprint 1 replaces with full profile form */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-500">
          {session?.userId ? "✓ " : ""}
          {session?.userId ?? "—"}
        </p>
      </div>

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
          {await getTranslations("auth").then((ta) => ta("signOut"))}
        </button>
      </form>
    </div>
  );
}
