import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useState, useEffect } from "react";

export default function UpgradeCornerPanel() {
  const t = useTranslations("layout");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem("upgrade_corner_dismissed");
    setVisible(!dismissed);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("upgrade_corner_dismissed", "true");
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[320px] max-w-[90vw] rounded-lg border border-primary/30 bg-card shadow-lg p-4">
      {/* содержимое без изменений */}
      <div className="flex items-start gap-3">
        <div className="text-2xl">🚀</div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold">{t("limitWarning.title")}</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("limitWarning.description")}
          </p>
          <ul className="text-xs mt-2 space-y-1">
            <li>• {t("limitWarning.budgets")}</li>
            <li>• {t("limitWarning.assistant")}</li>
          </ul>
          <Link href="/paywall">
            <Button size="sm" className="mt-3 w-full">
              {t("upgradeBanner.cta")}
            </Button>
          </Link>
        </div>
        <button
          className="ml-2 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
          aria-label="Close"
          title="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
