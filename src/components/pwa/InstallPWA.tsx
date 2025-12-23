"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import usePWAInstall from "@/hooks/usePWAInstall";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/routing";
import { UserAuth } from "@/context/AuthContext";

type InAppBrowserGuardProps = {
  open: boolean;
};

export function InAppBrowserGuard({ open }: InAppBrowserGuardProps) {
  const tPwa = useTranslations("pwa");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-black/70 backdrop-blur-md px-6">
      <div className="max-w-sm w-full rounded-3xl border border-white/10 bg-gradient-to-b from-background/95 to-background/90 shadow-2xl shadow-black/40 p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
          <Image
            src="/icons/icon-192x192.png"
            alt="Spendly"
            width={40}
            height={40}
            className="rounded-2xl"
          />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          {tPwa("guard.title")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {tPwa("guard.description")}
        </p>
        <div className="mt-6 flex flex-col items-end">
          <Image
            src="/assets/install/arrow-guide.png"
            alt="Open in browser hint"
            width={120}
            height={120}
            className="h-24 w-24 animate-bounce drop-shadow-[0_10px_25px_rgba(0,0,0,0.45)]"
          />
        </div>
      </div>
    </div>
  );
}

type IOSInstallDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function IOSInstallDrawer({
  open,
  onOpenChange,
}: IOSInstallDrawerProps) {
  const tPwa = useTranslations("pwa");

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="z-[130] border-border bg-card">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 pb-4">
          <DrawerHeader className="items-center text-center gap-3">
            <div className="flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Image
                  src="/icons/icon-192x192.png"
                  alt="Spendly"
                  width={48}
                  height={48}
                  className="rounded-2xl"
                />
              </div>
            </div>
            <DrawerTitle className="text-base sm:text-lg">
              {tPwa("ios.title")}
            </DrawerTitle>
            <DrawerDescription className="text-sm">
              {tPwa("ios.description")}
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-3 px-4 pb-2 text-sm">
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-3 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background shadow-sm">
                <Image
                  src="/assets/install/share-ios.svg"
                  alt="Share"
                  width={20}
                  height={20}
                />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {tPwa("ios.step1Title")}
                </span>
                <span className="text-sm text-foreground">
                  {tPwa("ios.step1Text")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-3 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background shadow-sm">
                <Image
                  src="/assets/install/plus-square.svg"
                  alt="Add"
                  width={20}
                  height={20}
                />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {tPwa("ios.step2Title")}
                </span>
                <span className="text-sm text-foreground">
                  {tPwa("ios.step2Text")}
                </span>
              </div>
            </div>
          </div>

          <DrawerFooter className="pt-0">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              {tPwa("ios.notNow")}
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

type InstallButtonProps = {
  onClick: () => void | Promise<void>;
  className?: string;
};

export function InstallButton({ onClick, className }: InstallButtonProps) {
  const tPwa = useTranslations("pwa");

  const defaultClass =
    "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary/80 px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/40 hover:from-primary/90 hover:to-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

  return (
    <Button
      type="button"
      onClick={onClick}
      className={className ?? defaultClass}
    >
      <Download className="h-4 w-4 text-white" />
      {tPwa("button.install")}
    </Button>
  );
}

type InstallPWAProps = {
  showButton?: boolean;
  floating?: boolean;
  buttonClassName?: string;
  forceShowButton?: boolean;
};

export default function InstallPWA({
  showButton = true,
  floating = false,
  buttonClassName,
  forceShowButton = false,
}: InstallPWAProps) {
  const { isInstallPromptAvailable, isIOS, isStandalone, isInAppBrowser, promptInstall } =
    usePWAInstall();
  const pathname = usePathname();
  const { session } = UserAuth();
  const [iosDrawerOpen, setIosDrawerOpen] = useState(false);
  const [iosDrawerAutoShown, setIosDrawerAutoShown] = useState(false);
  const [isPrimaryInstance] = useState(() => {
    if (typeof window === "undefined") return true;
    if ((window as any).__spendlyPwaPrimaryInstance) {
      return false;
    }
    (window as any).__spendlyPwaPrimaryInstance = true;
    return true;
  });

  const isBlockedInApp = isInAppBrowser && !isStandalone;
  const showInstallButton =
    !isStandalone && isInstallPromptAvailable && !isBlockedInApp;
  const effectiveShowButton =
    (forceShowButton && !isStandalone && !isBlockedInApp) || showInstallButton;
  const shouldAttachIosDrawer = isIOS && !isStandalone && !isBlockedInApp;
  const isAuthRoute =
    pathname?.includes("/auth") ||
    pathname?.includes("/forgot-password") ||
    pathname?.includes("/reset-password");
  const canShowInstallUi = !!session && !isAuthRoute;
  const canShowButtonUi = forceShowButton || canShowInstallUi;

  useEffect(() => {
    if (!isPrimaryInstance) return;
    if (!canShowInstallUi) return;
    if (!shouldAttachIosDrawer) return;
    if (iosDrawerAutoShown) return;

    const timeoutId = window.setTimeout(() => {
      setIosDrawerOpen(true);
      setIosDrawerAutoShown(true);
      (window as any).__spendlyIosDrawerShown = true;
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isPrimaryInstance, canShowInstallUi, shouldAttachIosDrawer, iosDrawerAutoShown]);

  const handleInstallClick = async () => {
    const result = await promptInstall();
    if (result === "ios") {
      setIosDrawerOpen(true);
      setIosDrawerAutoShown(true);
    }
  };

  return (
    <>
      {isPrimaryInstance && <InAppBrowserGuard open={isBlockedInApp} />}
      {canShowButtonUi && showButton && effectiveShowButton && (
        <div
          className={
            floating
              ? "fixed right-4 bottom-[104px] z-[110] pointer-events-auto"
              : ""
          }
        >
          <InstallButton onClick={handleInstallClick} className={buttonClassName} />
        </div>
      )}
      {isPrimaryInstance && canShowInstallUi && shouldAttachIosDrawer && (
        <IOSInstallDrawer
          open={iosDrawerOpen}
          onOpenChange={(open) => {
            setIosDrawerOpen(open);
            if (!open) {
              setIosDrawerAutoShown(true);
            }
          }}
        />
      )}
    </>
  );
}
