import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // 1. Check if app is already installed
        setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);

        // 2. Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        // 3. Capture event for Android/Desktop
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const promptInstall = async () => {
        if (deferredPrompt) {
            // Android Logic
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        } else if (isIOS) {
            // iOS Logic: Signal to open instruction drawer
            return "OPEN_IOS_INSTRUCTIONS";
        }
    };

    // Show button if: (Android Prompt is ready OR It is iOS) AND (App is not installed)
    const showInstallButton = !isStandalone && (!!deferredPrompt || isIOS);

    return { showInstallButton, promptInstall, isIOS };
}
