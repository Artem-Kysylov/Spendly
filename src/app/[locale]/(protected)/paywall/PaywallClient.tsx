"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useTranslations, useLocale } from "next-intl";
import { Check, Sparkles, Rocket, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useSubscription } from "@/hooks/useSubscription";
import { trackEvent } from "@/lib/telemetry";
import { useRouter } from "@/i18n/routing";
import type { ToastMessageProps } from "@/types/types";
import ToastMessage from "@/components/ui-elements/ToastMessage";

export default function PaywallClient() {
    const tPaywall = useTranslations("paywall");
    const tPricing = useTranslations("pricing");
    const locale = useLocale();
    const router = useRouter();
    const { subscriptionPlan } = useSubscription();
    const [toast, setToast] = useState<ToastMessageProps | null>(null);
    const CHECKOUT_URL = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_CHECKOUT_URL;

    const handleUpgradeClick = async (plan: "monthly" | "yearly") => {
        trackEvent("paywall_cta_clicked", { plan, from: "paywall" });

        try {
            // Use existing payment logic from PaymentClient
            if (CHECKOUT_URL) {
                console.log("[Paywall] Using env checkout URL ->", CHECKOUT_URL);
                if (CHECKOUT_URL.includes("/checkout/buy/")) {
                    console.warn(
                        "[Paywall] Env contains legacy buy URL; skipping to avoid 404.",
                    );
                    setToast({ text: "Coming soon!", type: "success" });
                    setTimeout(() => setToast(null), 3000);
                    return;
                }
                window.location.href = CHECKOUT_URL;
                return;
            }

            // Fallback to API
            const res = await fetch("/api/checkout-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ locale }),
            });
            if (!res.ok) throw new Error("Failed to create checkout");

            const { url } = await res.json();
            console.log("[Paywall] Fresh checkout URL ->", url);

            if (typeof url !== "string" || url.includes("/checkout/buy/")) {
                console.warn(
                    "[Paywall] API returned legacy buy link or invalid URL; skipping to avoid 404.",
                );
                setToast({ text: "Coming soon!", type: "success" });
                setTimeout(() => setToast(null), 3000);
                return;
            }

            window.location.href = url;
        } catch (e) {
            console.warn("[Paywall] No checkout URL available:", e);
            setToast({ text: "Coming soon!", type: "success" });
            setTimeout(() => setToast(null), 3000);
        }
    };

    // If already pro, redirect to dashboard
    if (subscriptionPlan === "pro") {
        router.push("/dashboard");
        return null;
    }

    const freeFeatures = [
        tPaywall("comparison.free1"),
        tPaywall("comparison.free2"),
        tPaywall("comparison.free3"),
        tPaywall("comparison.free4"),
    ];

    const proFeatures = [
        tPaywall("comparison.pro1"),
        tPaywall("comparison.pro2"),
        tPaywall("comparison.pro3"),
        tPaywall("comparison.pro4"),
        tPaywall("comparison.pro5"),
        tPaywall("comparison.pro6"),
    ];

    return (
        <div className="container mx-auto px-4 py-10 max-w-6xl">
            {toast && <ToastMessage text={toast.text} type={toast.type} />}

            {/* Hero Section */}
            <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
            >
                <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">
                        {tPaywall("hero.badge")}
                    </span>
                </div>
                <h1 className="text-[32px] md:text-[42px] font-bold text-secondary-black dark:text-white mb-4">
                    {tPaywall("hero.title")}
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                    {tPaywall("hero.subtitle")}
                </p>
            </motion.div>

            {/* Comparison Table */}
            <motion.div
                className="mb-16"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            >
                <h2 className="text-2xl font-semibold text-center mb-8 text-secondary-black dark:text-white">
                    {tPaywall("comparison.title")}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {/* Free Plan Card */}
                    <div className="rounded-2xl border-2 border-gray-200 dark:border-border p-6 bg-white dark:bg-card">
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-semibold text-secondary-black dark:text-white mb-2">
                                {tPricing("free.label")}
                            </h3>
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-4xl font-bold text-secondary-black dark:text-white">
                                    $0
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">
                                    {tPricing("perMonth")}
                                </span>
                            </div>
                        </div>
                        <ul className="space-y-3">
                            {freeFeatures.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {feature}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Pro Plan Card */}
                    <div className="rounded-2xl border-2 border-primary dark:border-primary p-6 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/15 relative overflow-hidden">
                        <div className="absolute top-4 right-4">
                            <div className="px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold">
                                {tPaywall("comparison.popular")}
                            </div>
                        </div>
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-semibold text-secondary-black dark:text-white mb-2">
                                {tPricing("pro.label")}
                            </h3>
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-4xl font-bold text-secondary-black dark:text-white">
                                    $7
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">
                                    {tPricing("perMonth")}
                                </span>
                            </div>
                        </div>
                        <ul className="space-y-3 mb-6">
                            {proFeatures.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                    <span className="text-sm text-gray-800 dark:text-white font-medium">
                                        {feature}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <Button
                            onClick={() => handleUpgradeClick("monthly")}
                            className="w-full h-12 text-base font-semibold"
                        >
                            <Rocket className="h-4 w-4 mr-2" />
                            {tPaywall("cta.monthly")}
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* Social Proof */}
            <motion.div
                className="mb-16 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            >
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary/5 dark:bg-primary/10 border border-primary/20">
                    <Shield className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {tPaywall("social.trusted")}
                    </span>
                </div>
            </motion.div>

            {/* FAQ Section */}
            <motion.div
                className="max-w-3xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
            >
                <h2 className="text-2xl font-semibold text-center mb-8 text-secondary-black dark:text-white">
                    {tPaywall("faq.title")}
                </h2>
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="text-left">
                            {tPaywall("faq.q1")}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-600 dark:text-gray-300">
                            {tPaywall("faq.a1")}
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                        <AccordionTrigger className="text-left">
                            {tPaywall("faq.q2")}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-600 dark:text-gray-300">
                            {tPaywall("faq.a2")}
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                        <AccordionTrigger className="text-left">
                            {tPaywall("faq.q3")}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-600 dark:text-gray-300">
                            {tPaywall("faq.a3")}
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-4">
                        <AccordionTrigger className="text-left">
                            {tPaywall("faq.q4")}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-600 dark:text-gray-300">
                            {tPaywall("faq.a4")}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </motion.div>
        </div>
    );
}
