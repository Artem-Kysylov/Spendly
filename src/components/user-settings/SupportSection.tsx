"use client";

import { useTranslations } from "next-intl";
import { Bug, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";



const XIcon = ({ className }: { className?: string }) => (
    <svg
        role="img"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        className={className}
    >
        <title>X</title>
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
);

export function SupportSection() {
    const t = useTranslations("userSettings");
    const tCommon = useTranslations("common");

    const bugReportBody = `Describe the bug here:%0D%0A%0D%0A1. What happened?%0D%0A2. Expected result:%0D%0A3. Steps to reproduce:%0D%0A`;

    return (
        <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
                {t("support_title")}
            </h2>

            <Card className="flex flex-col p-2 gap-2">
                {/* Bug Report */}
                <Drawer>
                    <DrawerTrigger asChild>
                        <Button
                            variant="ghost"
                            className="group flex h-auto w-full items-center justify-start gap-3 p-3 hover:bg-muted/50"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                                <Bug className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div className="flex flex-col items-start gap-0.5 text-left">
                                <span className="font-medium">{t("btn_report_bug")}</span>
                            </div>
                        </Button>
                    </DrawerTrigger>

                    <DrawerContent>
                        <div className="mx-auto w-full max-w-sm">
                            <DrawerHeader>
                                <DrawerTitle>{t("bug_drawer.title")}</DrawerTitle>
                                <DrawerDescription>{t("bug_drawer.desc")}</DrawerDescription>
                            </DrawerHeader>

                            <div className="p-4">
                                <ul className="space-y-3 pl-2">
                                    <li className="flex items-start gap-3 text-sm text-muted-foreground">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                            1
                                        </span>
                                        {t("bug_drawer.tip_1")}
                                    </li>
                                    <li className="flex items-start gap-3 text-sm text-muted-foreground">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                            2
                                        </span>
                                        {t("bug_drawer.tip_2")}
                                    </li>
                                    <li className="flex items-start gap-3 text-sm text-muted-foreground">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                            3
                                        </span>
                                        {t("bug_drawer.tip_3")}
                                    </li>
                                </ul>
                            </div>

                            <DrawerFooter>
                                <Button asChild className="w-full">
                                    <a
                                        href={`mailto:support@getspendly.net?subject=Bug Report (Spendly App)&body=${bugReportBody}`}
                                    >
                                        {t("bug_drawer.btn_continue")}
                                    </a>
                                </Button>
                                <DrawerClose asChild>
                                    <Button variant="outline">{tCommon("cancel")}</Button>
                                </DrawerClose>
                            </DrawerFooter>
                        </div>
                    </DrawerContent>
                </Drawer>

                <div className="h-[1px] w-full bg-gray-200 dark:bg-gray-800 my-1" />

                {/* Contact Support */}
                <Button
                    variant="ghost"
                    className="group flex h-auto w-full items-center justify-start gap-3 p-3 hover:bg-muted/50"
                    asChild
                >
                    <a
                        href="mailto:hello@getspendly.net?subject=Feedback (Spendly App)"
                        className="flex w-full items-center justify-start gap-3"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                            <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex flex-col items-start gap-0.5 text-left">
                            <span className="font-medium">{t("btn_contact_support")}</span>
                        </div>
                    </a>
                </Button>

                <div className="h-[1px] w-full bg-gray-200 dark:bg-gray-800 my-1" />

                {/* Twitter */}
                <Button
                    variant="ghost"
                    className="group flex h-auto w-full items-center justify-start gap-3 p-3 hover:bg-muted/50"
                    asChild
                >
                    <a
                        href="https://x.com/tabXport"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-start gap-3"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
                            <XIcon className="h-4 w-4 text-black dark:text-white" />
                        </div>
                        <div className="flex flex-col items-start gap-0.5 text-left">
                            <span className="font-medium">{t("btn_twitter")}</span>
                        </div>
                    </a>
                </Button>
            </Card>
        </section>
    );
}
