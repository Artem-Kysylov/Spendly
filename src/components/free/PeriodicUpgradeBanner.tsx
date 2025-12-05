import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useState, useEffect } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { trackEvent } from "@/lib/telemetry";

export default function PeriodicUpgradeBanner() {
  const t = useTranslations("layout");
  const { subscriptionPlan } = useSubscription();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (subscriptionPlan === "pro") return;
    if (typeof window === "undefined") return;

    const STORAGE_KEY = "spendly:periodic_banner:last_shown_at";
    const DAY_MS = 24 * 60 * 60 * 1000;

    try {
      const lastShown = parseInt(
        window.localStorage.getItem(STORAGE_KEY) || "0",
        10,
      );
      const now = Date.now();
      const shouldShow =
        !Number.isFinite(lastShown) || now - lastShown >= DAY_MS;

      if (shouldShow) {
        setVisible(true);
        window.localStorage.setItem(STORAGE_KEY, String(now));
      }
    } catch {
      // В случае ошибки в localStorage всё равно покажем разок
      setVisible(true);
    }
  }, [subscriptionPlan]);

  if (!visible || subscriptionPlan === "pro") return null;

  const handleUpgradeClick = () => {
    trackEvent("upgrade_cta_clicked", { from: "periodic_banner" });
  };

  const handleDismiss = () => {
    setVisible(false);
    try {
      const STORAGE_KEY = "spendly:periodic_banner:last_shown_at";
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* no-op */
    }
  };

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-5 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-xl">🚀</span>
        <div>
          <div className="text-sm font-semibold">
            {t("periodicBanner.title")}
          </div>
          <div className="text-xs text-muted-foreground">
            {t("periodicBanner.description")}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={handleDismiss}>
          {t("periodicBanner.dismiss")}
        </Button>
        <Link href="/payment" onClick={handleUpgradeClick}>
          <Button size="sm">{t("upgradeBanner.cta")}</Button>
        </Link>
      </div>
    </div>
  );
}
