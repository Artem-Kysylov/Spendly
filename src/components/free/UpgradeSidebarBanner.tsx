import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { useLocale } from "next-intl";
import { UserAuth } from "@/context/AuthContext";
import { useRouter } from "@/i18n/routing";
// import { trackEvent } from "@/lib/telemetry";

export default function UpgradeSidebarBanner() {
  const t = useTranslations("layout");
  const locale = useLocale();
  const { session } = UserAuth();
  const { subscriptionPlan } = useSubscription();
  const router = useRouter();

  if (subscriptionPlan === "pro") return null;

  const handleUpgradeClick = () => {
    // trackEvent("upgrade_cta_clicked", { from: "sidebar_banner" });
    router.push("/paywall");
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-card p-3">
      <h4 className="text-sm font-semibold">{t("upgradeBanner.title")}</h4>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("upgradeBanner.description")}
      </p>
      <Button size="sm" className="mt-2 w-full" onClick={handleUpgradeClick}>
        {t("upgradeBanner.cta")}
      </Button>
    </div>
  );
}
