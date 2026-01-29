"use client";
import { Button } from "@/components/ui/button";
import { RocketIcon } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";

export function TopbarRocketButton() {
  const t = useTranslations("layout.upgradeBanner");
  const locale = useLocale();
  const router = useRouter();

  const handleUpgradeClick = () => {
    router.push("/paywall");
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
