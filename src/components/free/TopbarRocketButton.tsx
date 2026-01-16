"use client";
import { Button } from "@/components/ui/button";
import { RocketIcon } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { UserAuth } from "@/context/AuthContext";

export function TopbarRocketButton() {
  const t = useTranslations("layout.upgradeBanner");
  const locale = useLocale();
  const { session } = UserAuth();

  const handleUpgradeClick = () => {
    const priceId = "pri_01kf3g78sjap8307ctf6p6e0xm";
    const paddle = (window as any)?.Paddle;
    if (!paddle?.Checkout?.open) {
      console.warn("[TopbarRocketButton] Paddle is not available on window yet");
      return;
    }

    paddle.Checkout.open({
      settings: {
        displayMode: "overlay",
        locale,
        theme: "light",
      },
      items: [{ priceId, quantity: 1 }],
      customData: {
        user_id: session?.user?.id,
        plan: "monthly",
      },
      customer: session?.user?.email ? { email: session.user.email } : undefined,
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
