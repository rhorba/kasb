import { redirect } from "next/navigation";

// Root locale page — redirect to home (auth guard in owner layout)
export default async function LocaleRootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/home`);
}
