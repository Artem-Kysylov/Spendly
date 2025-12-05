import AuthPageClient from "./AuthPageClient";

export default function Page() {
  return <AuthPageClient />;
}

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<import("next").Metadata> {
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations({
    locale,
    namespace: "pages.auth.home.meta",
  });
  return { title: t("title"), description: t("description") };
}
