"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet";
import useDeviceType from "@/hooks/useDeviceType";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Rocket, X } from "lucide-react";
import { useLocale } from "next-intl";
import { UserAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
// import { trackEvent } from "@/lib/telemetry";

type LimitReachedModalProps = {
    isOpen: boolean;
    onClose: () => void;
    limitType: "budgets" | "wallets" | "custom";
    customMessage?: string;
};

export default function LimitReachedModal({
    isOpen,
    onClose,
    limitType,
    customMessage,
}: LimitReachedModalProps) {
    const tLimitReached = useTranslations("limitReached");
    const tCommon = useTranslations("common");
    const locale = useLocale();
    const { session } = UserAuth();
    const { isMobile } = useDeviceType();
    const { mobileSheetsEnabled } = useFeatureFlags();
    const router = useRouter();

    const handleUpgrade = () => {
        // trackEvent("limit_reached_upgrade_clicked", { limitType });
        const safeLocale = (locale || "en").trim();
        const qs = new URLSearchParams({
            plan: "monthly",
            from: "limit_reached",
            limitType,
        });
        if (session?.user?.id) {
            qs.set("userId", session.user.id);
        }
        router.push(`/${safeLocale}/paywall?${qs.toString()}`);
        onClose();
    };

    const getMessage = () => {
        if (customMessage) return customMessage;
        return tLimitReached(limitType);
    };

    // Mobile Sheet
    if (isMobile && mobileSheetsEnabled) {
        return (
            <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <SheetContent
                    side="bottom"
                    className="z-[10000] rounded-t-3xl"
                    overlayClassName="bg-foreground/50"
                >
                    <div className="mx-auto mt-2 mb-4 h-1.5 w-12 rounded-full bg-muted" />
                    <SheetHeader className="text-center relative">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                            <Rocket className="h-8 w-8 text-primary" />
                        </div>
                        <SheetTitle className="text-xl px-4">
                            {tLimitReached("title")}
                        </SheetTitle>
                    </SheetHeader>

                    <div className="mt-6 space-y-4 px-4">
                        <p className="text-center text-gray-600 dark:text-gray-300">
                            {getMessage()}
                        </p>
                        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                            {tLimitReached("description")}
                        </p>
                    </div>

                    <SheetFooter className="mt-8 px-4 gap-3">
                        <Button onClick={handleUpgrade} className="w-full h-12 text-base">
                            <Rocket className="h-4 w-4 mr-2" />
                            {tLimitReached("upgrade")}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="w-full h-12 text-base"
                        >
                            {tLimitReached("cancel")}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        );
    }

    // Desktop Dialog
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="relative">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                        <Rocket className="h-8 w-8 text-primary" />
                    </div>
                    <DialogTitle className="text-center text-xl px-4">
                        {tLimitReached("title")}
                    </DialogTitle>
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
                    >
                        <X size={22} />
                    </button>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <p className="text-center text-gray-600 dark:text-gray-300">
                        {getMessage()}
                    </p>
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                        {tLimitReached("description")}
                    </p>
                </div>

                <DialogFooter className="sm:flex-col gap-3">
                    <Button onClick={handleUpgrade} className="w-full h-11">
                        <Rocket className="h-4 w-4 mr-2" />
                        {tLimitReached("upgrade")}
                    </Button>
                    <Button variant="ghost" onClick={onClose} className="w-full h-11">
                        {tLimitReached("cancel")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
