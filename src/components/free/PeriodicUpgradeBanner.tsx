import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useRouter } from "@/i18n/routing";
// import { trackEvent } from "@/lib/telemetry";

export default function PeriodicUpgradeBanner() {
  const t = useTranslations("layout");
  const router = useRouter();
  const { subscriptionPlan } = useSubscription();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (subscriptionPlan === "pro") return;
    if (typeof window === "undefined") return;

    const STORAGE_KEY = "spendly:periodic_banner:last_shown_at";
    const DAY_MS = 24 * 60 * 60 * 1000;
    const SHOW_INTERVAL_MS = 7 * DAY_MS; // 7 days

    try {
      const lastShown = parseInt(
        window.localStorage.getItem(STORAGE_KEY) || "0",
        10,
      );
      const now = Date.now();
      const shouldShow =
        !Number.isFinite(lastShown) || now - lastShown >= SHOW_INTERVAL_MS;

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
    router.push("/paywall");
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
    <div className="bg-primary/10 border-b border-primary/20 px-3 sm:px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <span className="text-lg sm:text-xl flex-shrink-0">🚀</span>
        <div className="min-w-0 flex-1">
          <div className="text-xs sm:text-sm font-semibold truncate">
            {t("periodicBanner.title")}
          </div>
          <div className="text-xs text-muted-foreground line-clamp-2 sm:line-clamp-1">
            {t("periodicBanner.description")}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={handleDismiss} className="flex-1 sm:flex-initial text-xs sm:text-sm">
          {t("periodicBanner.dismiss")}
        </Button>
        <Button size="sm" className="w-full text-xs sm:text-sm flex-1 sm:flex-initial" onClick={handleUpgradeClick}>
          {t("upgradeBanner.cta")}
        </Button>
      </div>
    </div>
  );
}

