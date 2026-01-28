import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { UserAuth } from "@/context/AuthContext";

export default function UpgradeCornerPanel() {
  const t = useTranslations("layout");
  const locale = useLocale();
  const { session } = UserAuth();
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

  const handleUpgradeClick = async () => {
    const waitForPaddleInitialized = async (timeoutMs = 2000) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if ((window as any)?.__SPENDLY_PADDLE_INITIALIZED === true) return true;
        await new Promise((r) => setTimeout(r, 50));
      }
      return (window as any)?.__SPENDLY_PADDLE_INITIALIZED === true;
    };

    const fallback = (process.env.NEXT_PUBLIC_PADDLE_PRICE_ID || "").trim();
    const priceId = (process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY || "").trim() ||
      fallback;
    if (!priceId) {
      console.warn("[UpgradeCornerPanel] Missing Paddle priceId");
      return;
    }
    const paddle = (window as any)?.Paddle;
    if (!paddle?.Checkout?.open) {
      console.warn("[UpgradeCornerPanel] Paddle is not available on window yet");
      return;
    }

    const initialized = await waitForPaddleInitialized();
    if (!initialized) {
      console.warn("[UpgradeCornerPanel] Paddle is not initialized yet");
      return;
    }

    const userId = session?.user?.id;
    const customData: Record<string, string> = { plan: "monthly" };
    if (typeof userId === "string" && userId.length > 0) customData.user_id = userId;

    paddle.Checkout.open({
      settings: {
        displayMode: "overlay",
        locale,
        theme: "light",
      },
      items: [{ priceId, quantity: 1 }],
      customData,
    });
  };

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
          <Button size="sm" className="mt-3 w-full" onClick={handleUpgradeClick}>
            {t("upgradeBanner.cta")}
          </Button>
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
