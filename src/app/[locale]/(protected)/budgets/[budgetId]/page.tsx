import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isSupportedLanguage } from "@/i18n/config";
import { getTranslations } from "next-intl/server";
import { getServerSupabaseClient } from "@/lib/serverSupabase";
import BudgetDetailsClient from "./BudgetDetailsClient";

export default function BudgetDetailsPage() {
  return <BudgetDetailsClient />;
}

export async function generateMetadata({
  params,
}: {
  params: { budgetId: string };
}): Promise<Metadata> {
  const cookieLocale =
    cookies().get("NEXT_LOCALE")?.value ||
    cookies().get("spendly_locale")?.value ||
    DEFAULT_LOCALE;

  const locale = isSupportedLanguage(cookieLocale || "")
    ? (cookieLocale as any)
    : DEFAULT_LOCALE;

  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from("budget_folders")
    .select("name")
    .eq("id", params.budgetId)
    .single();

  const budgetName = error ? null : (data?.name ?? null);
  const t = await getTranslations({
    locale,
    namespace: "pages.budgetDetails.meta",
  });

  return {
    title: budgetName ? t("titleWithName", { name: budgetName }) : t("title"),
    description: budgetName
      ? t("descriptionWithName", { name: budgetName })
      : t("description"),
  };
}
