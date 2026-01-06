import { getTranslations } from "next-intl/server";
import PaywallClient from "./PaywallClient";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "seo.paywall" });

    return {
        title: t("title"),
        description: t("description"),
    };
}

export default function PaywallPage() {
    return <PaywallClient />;
}
