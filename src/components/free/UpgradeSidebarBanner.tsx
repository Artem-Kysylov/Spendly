import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { useLocale } from "next-intl";
import { UserAuth } from "@/context/AuthContext";
// import { trackEvent } from "@/lib/telemetry";

export default function UpgradeSidebarBanner() {
  const t = useTranslations("layout");
  const locale = useLocale();
  const { session } = UserAuth();
  const { subscriptionPlan } = useSubscription();

  if (subscriptionPlan === "pro") return null;

  const handleUpgradeClick = () => {
    // trackEvent("upgrade_cta_clicked", { from: "sidebar_banner" });

    const priceId = "pri_01kf3g78sjap8307ctf6p6e0xm";
    const paddle = (window as any)?.Paddle;
    if (!paddle?.Checkout?.open) {
      console.warn("[SidebarBanner] Paddle is not available on window yet");
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
