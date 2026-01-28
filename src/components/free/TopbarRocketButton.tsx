"use client";
import { Button } from "@/components/ui/button";
import { RocketIcon } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { UserAuth } from "@/context/AuthContext";

export function TopbarRocketButton() {
  const t = useTranslations("layout.upgradeBanner");
  const locale = useLocale();
  const { session } = UserAuth();

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
      console.warn("[TopbarRocketButton] Missing Paddle priceId");
      return;
    }
    const paddle = (window as any)?.Paddle;
    if (!paddle?.Checkout?.open) {
      console.warn("[TopbarRocketButton] Paddle is not available on window yet");
      return;
    }

    const initialized = await waitForPaddleInitialized();
    if (!initialized) {
      console.warn("[TopbarRocketButton] Paddle is not initialized yet");
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
    <Button
      variant="ghost"
      size="icon"
      aria-label={t("cta")}
      title={t("cta")}
      onClick={handleUpgradeClick}
      className="relative h-11 w-11 rounded-full border-2 border-primary text-primary bg-card hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <RocketIcon className="h-5 w-5" />
      <span className="pointer-events-none absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground shadow-sm">
        PRO
      </span>
    </Button>
  );
}
export default TopbarRocketButton;
