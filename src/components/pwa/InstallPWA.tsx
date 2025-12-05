"use client"
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share } from "lucide-react";
import usePWAInstall from "@/hooks/usePWAInstall";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose,
} from "@/components/ui/drawer";

export default function InstallPWA() {
    const { showInstallButton, promptInstall, isIOS } = usePWAInstall();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    if (!showInstallButton) return null;

    const handleClick = async () => {
        const result = await promptInstall();
        if (result === "OPEN_IOS_INSTRUCTIONS") {
            setIsDrawerOpen(true);
        }
    };

    return (
        <>
            <Button onClick={handleClick} variant="outline" className="w-full gap-2">
                <Download className="w-4 h-4" />
                Install Spendly
            </Button>

            <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <DrawerContent>
                    <div className="mx-auto w-full max-w-sm">
                        <DrawerHeader>
                            <DrawerTitle>Install on iPhone</DrawerTitle>
                            <DrawerDescription>
                                iOS requires manual installation. Follow these steps:
                            </DrawerDescription>
                        </DrawerHeader>

                        <div className="p-4 space-y-4 text-sm">
                            <div className="flex items-center gap-3">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-bold">1</span>
                                <span>Tap the <strong>Share</strong> button <Share className="inline w-4 h-4" /> in Safari menu.</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-bold">2</span>
                                <span>Scroll down and select <strong>"Add to Home Screen"</strong>.</span>
                            </div>
                        </div>

                        <DrawerFooter>
                            <DrawerClose asChild>
                                <Button variant="outline">Close</Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </div>
                </DrawerContent>
            </Drawer>
        </>
    );
}
