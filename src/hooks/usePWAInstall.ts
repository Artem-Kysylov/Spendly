import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallPromptAvailable, setIsInstallPromptAvailable] =
    useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const userAgent = window.navigator.userAgent || "";
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    const isIosDevice = /iPhone|iPad|iPod/i.test(userAgent);
    const isSocialInApp = /TikTok|Instagram|FBAN|FBAV|FB_IAB/i.test(userAgent);
    const isGenericWebView =
      /\bwv\b/i.test(userAgent) ||
      /\bWebView\b/i.test(userAgent) ||
      (isIosDevice && /AppleWebKit/i.test(userAgent) && !/Safari/i.test(userAgent));
    const inApp = (isSocialInApp || isGenericWebView) || false;

    setIsIOS(isIosDevice);
    setIsInAppBrowser(inApp);
    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) {
      setDeferredPrompt(null);
      setIsInstallPromptAvailable(false);
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const e = event as BeforeInstallPromptEvent;
      setDeferredPrompt(e);
      setIsInstallPromptAvailable(true);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setIsInstallPromptAvailable(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setIsInstallPromptAvailable(false);
      }
      return outcome;
    }

    if (isIOS && !isStandalone) {
      return "ios";
    }

    return null;
  };

  return {
    isInstallPromptAvailable,
    isIOS,
    isStandalone,
    isInAppBrowser,
    promptInstall,
  };
}
