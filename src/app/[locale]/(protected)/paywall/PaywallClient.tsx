"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Check, Sparkles, Rocket, Shield, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useSubscription } from "@/hooks/useSubscription";
// import { trackEvent } from "@/lib/telemetry";
import type { ToastMessageProps } from "@/types/types";
import ToastMessage from "@/components/ui-elements/ToastMessage";
import { useSearchParams } from "next/navigation";

export default function PaywallClient() {
    const tPaywall = useTranslations("paywall");
    const tPricing = useTranslations("pricing");
    const searchParams = useSearchParams();
    const { subscriptionPlan, isLoading: isSubscriptionLoading } = useSubscription();
    const [toast, setToast] = useState<ToastMessageProps | null>(null);
    const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

    type Plan = "monthly" | "yearly" | "lifetime";

    const requestedPlan = useMemo<Plan | null>(() => {
        const p = (searchParams?.get("plan") || "").toLowerCase();
        if (p === "monthly" || p === "yearly" || p === "lifetime") return p;
        return null;
    }, [searchParams]);

    const monthlyRef = useRef<HTMLDivElement | null>(null);
    const yearlyRef = useRef<HTMLDivElement | null>(null);
    const lifetimeRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!requestedPlan) return;
        const target =
            requestedPlan === "monthly"
                ? monthlyRef
                : requestedPlan === "yearly"
                    ? yearlyRef
                    : lifetimeRef;
        target.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [requestedPlan]);

    const handleUpgradeClick = (plan: Plan) => {
        // trackEvent("paywall_cta_clicked", { plan, from: "paywall" });

        try {
            const fallback = (process.env.NEXT_PUBLIC_PADDLE_PRICE_ID || "").trim();
            const priceId = (
                plan === "monthly"
                    ? (process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY || "").trim()
                    : plan === "yearly"
                        ? (process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_YEARLY || "").trim()
                        : (process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_LIFETIME || "").trim()
            ) || fallback;

            if (!priceId) {
                setToast({ text: "Checkout is unavailable. Please try again.", type: "error" });
                setTimeout(() => setToast(null), 3000);
                return;
            }

            console.log("[Paywall] priceId:", priceId);
            if (!String(priceId).startsWith("pri_")) {
                console.warn("[Paywall] priceId does not look like a production pri_ id", { priceId });
            }

            const paddle = (window as any)?.Paddle;
            if (!paddle?.Checkout?.open) {
                console.warn("[Paywall] Paddle is not available on window yet");
                setToast({ text: "Checkout is unavailable. Please try again.", type: "error" });
                setTimeout(() => setToast(null), 3000);
                return;
            }

            const wasInitialized = (window as any)?.__SPENDLY_PADDLE_INITIALIZED === true;
            const token = (
                process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ||
                process.env.NEXT_PUBLIC_PADDLE_TOKEN ||
                ""
            ).trim();

            if (!wasInitialized && !token) {
                console.warn("[Paywall] Missing Paddle client token");
                setToast({ text: "Checkout is unavailable. Please try again.", type: "error" });
                setTimeout(() => setToast(null), 3000);
                return;
            }

            if (token) {
                const rawEnv = (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || "")
                    .trim()
                    .toLowerCase();
                const normalizedEnv =
                    rawEnv === "production" || rawEnv === "live" || rawEnv === "prod"
                        ? "production"
                        : rawEnv === "sandbox" || rawEnv === "test"
                            ? "sandbox"
                            : "";

                const htmlLang =
                    typeof document !== "undefined"
                        ? (document.documentElement.lang || "").trim()
                        : "";

                try {
                    const initArgs: Record<string, unknown> = {
                        token,
                        checkout: {
                            settings: {
                                displayMode: "overlay",
                                theme: "light",
                                locale: htmlLang || "en",
                            },
                        },
                    };
                    if (normalizedEnv) initArgs.environment = normalizedEnv;
                    paddle.Initialize?.(initArgs);
                    (window as any).__SPENDLY_PADDLE_INITIALIZED = true;
                } catch (e) {
                    console.warn("[Paywall] Paddle.Initialize failed", e);
                    if (!wasInitialized) {
                        setToast({ text: "Checkout is unavailable. Please try again.", type: "error" });
                        setTimeout(() => setToast(null), 3000);
                        return;
                    }
                }
            }

            if ((window as any)?.__SPENDLY_PADDLE_INITIALIZED !== true) {
                console.warn("[Paywall] Paddle is not initialized yet");
                setToast({ text: "Checkout is unavailable. Please try again.", type: "error" });
                setTimeout(() => setToast(null), 3000);
                return;
            }

            setIsCheckoutLoading(true);
            const nakedCheckout =
                (process.env.NEXT_PUBLIC_PADDLE_NAKED_CHECKOUT || "").trim() === "true";

            if (nakedCheckout) {
                const nakedPayload = { items: [{ priceId, quantity: 1 }] };
                console.log("[Paywall] Opening naked checkout:", nakedPayload);
                paddle.Checkout.open(nakedPayload);
                setIsCheckoutLoading(false);
                return;
            }

            const checkoutPayload = {
                items: [{ priceId, quantity: 1 }],
            };
            console.log("[Paywall] Opening checkout:", checkoutPayload);
            paddle.Checkout.open(checkoutPayload);
            setIsCheckoutLoading(false);
        } catch (e) {
            console.warn("[Paywall] Paddle checkout failed:", e);
            setIsCheckoutLoading(false);
            setToast({ text: "Checkout failed. Please try again.", type: "error" });
            setTimeout(() => setToast(null), 3000);
        }
    };

    // If already pro, redirect to dashboard
    // Commented out to allow Pro users to view the page
    // if (subscriptionPlan === "pro") {
    //     router.push("/dashboard");
    //     return null;
    // }

    const isFree = subscriptionPlan === "free";
    const isMonthlySelected = requestedPlan === "monthly";
    const isYearlySelected = requestedPlan === "yearly";
    const isLifetimeSelected = requestedPlan === "lifetime";

    return (
        <div className="container mx-auto px-4 py-10 max-w-[1280px]">
            {toast && <ToastMessage text={toast.text} type={toast.type} />}

            {isSubscriptionLoading ? (
                <div className="mb-10">
                    <div className="h-6 w-40 mx-auto rounded bg-gray-100 dark:bg-muted animate-pulse" />
                    <div className="h-10 w-[min(520px,100%)] mx-auto mt-4 rounded bg-gray-100 dark:bg-muted animate-pulse" />
                    <div className="h-5 w-[min(640px,100%)] mx-auto mt-3 rounded bg-gray-100 dark:bg-muted animate-pulse" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
                        <div className="h-[420px] rounded-2xl border bg-gray-50 dark:bg-muted animate-pulse" />
                        <div className="h-[420px] rounded-2xl border bg-gray-50 dark:bg-muted animate-pulse" />
                        <div className="h-[420px] rounded-2xl border bg-gray-50 dark:bg-muted animate-pulse" />
                        <div className="h-[420px] rounded-2xl border bg-gray-50 dark:bg-muted animate-pulse" />
                    </div>
                </div>
            ) : null}

            {isCheckoutLoading ? (
                <div className="fixed inset-0 z-[1000] bg-black/30 backdrop-blur-[2px] flex items-center justify-center">
                    <span className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
                </div>
            ) : null}

            {isSubscriptionLoading ? null : (
                <>
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

                    {/* 4-Tier Pricing Grid */}
                    <motion.div
                        className="mb-16"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                    >
                <h2 className="text-2xl font-semibold text-center mb-8 text-secondary-black dark:text-white">
                    {tPaywall("comparison.title")}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Free Plan Card */}
                    <div className={`rounded-2xl border-2 p-6 bg-white dark:bg-card flex flex-col ${isFree ? "border-gray-400 dark:border-gray-500 ring-2 ring-gray-300" : "border-gray-300 dark:border-gray-600"}`}>
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-semibold text-secondary-black dark:text-white mb-2">
                                {tPaywall("comparison.free.label")}
                            </h3>
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-4xl font-bold text-secondary-black dark:text-white">
                                    $0
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 text-sm">
                                    {tPaywall("comparison.free.period")}
                                </span>
                            </div>
                        </div>
                        <ul className="space-y-3 mb-6 min-h-[200px] flex-1">
                            <li className="flex items-start gap-3">
                                <Check className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {tPaywall("comparison.free.feature1")}
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Check className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {tPaywall("comparison.free.feature3")}
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Check className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {tPaywall("comparison.free.feature4")}
                                </span>
                            </li>
                        </ul>
                        <Button
                            disabled={isFree}
                            className="w-full h-11 text-sm font-semibold"
                            variant="outline"
                        >
                            {tPaywall("comparison.free.cta")}
                        </Button>
                    </div>

                    {/* Monthly Plan Card */}
                    <div
                        ref={monthlyRef}
                        className={`scroll-mt-24 rounded-2xl border-2 p-6 bg-white dark:bg-card flex flex-col ${isMonthlySelected ? "border-primary ring-2 ring-primary/30" : "border-gray-200 dark:border-border"}`}
                    >
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-semibold text-secondary-black dark:text-white mb-2">
                                {tPaywall("comparison.monthly.label")}
                            </h3>
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-4xl font-bold text-secondary-black dark:text-white">
                                    {tPaywall("comparison.monthly.price")}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 text-sm">
                                    {tPaywall("comparison.monthly.period")}
                                </span>
                            </div>
                        </div>
                        <ul className="space-y-3 mb-6 min-h-[200px] flex-1">
                            <li className="flex items-start gap-3">
                                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-800 dark:text-white">
                                    {tPaywall("comparison.monthly.feature1")}
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-800 dark:text-white">
                                    {tPaywall("comparison.monthly.feature2")}
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-800 dark:text-white">
                                    {tPaywall("comparison.monthly.feature3")}
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-800 dark:text-white">
                                    {tPaywall("comparison.monthly.feature4")}
                                </span>
                            </li>
                        </ul>
                        <Button
                            onClick={() => handleUpgradeClick("monthly")}
                            className="w-full h-11 text-sm font-semibold"
                        >
                            <Rocket className="h-4 w-4 mr-2" />
                            {tPaywall("comparison.monthly.cta")}
                        </Button>
                    </div>

                    {/* Yearly Plan Card (Best Value) */}
                    <div
                        ref={yearlyRef}
                        className={`scroll-mt-24 rounded-2xl border-2 p-6 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/15 relative overflow-hidden ${isYearlySelected ? "ring-2 ring-primary/30" : ""} border-primary dark:border-primary`}
                    >
                        <div className="absolute top-2 right-2">
                            <div className="px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold">
                                {tPaywall("comparison.bestValue")}
                            </div>
                        </div>
                        <div className="text-center mb-6 pt-8">
                            <h3 className="text-xl font-semibold text-secondary-black dark:text-white mb-2">
                                {tPaywall("comparison.yearly.label")}
                            </h3>
                            <div className="flex flex-col items-center">
                                <div className="flex items-baseline justify-center gap-1">
                                    <span className="text-4xl font-bold text-secondary-black dark:text-white">
                                        {tPaywall("comparison.yearly.price")}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                                        {tPaywall("comparison.yearly.period")}
                                    </span>
                                </div>
                                <span className="text-xs text-primary mt-1">
                                    {tPaywall("comparison.yearly.priceNote")}
                                </span>
                            </div>
                        </div>
                        <ul className="space-y-3 mb-6 min-h-[200px]">
                            <li className="flex items-start gap-3">
                                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-800 dark:text-white font-medium">
                                    {tPaywall("comparison.yearly.feature1")}
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-800 dark:text-white font-medium">
                                    {tPaywall("comparison.yearly.feature2")}
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-800 dark:text-white font-medium">
                                    {tPaywall("comparison.yearly.feature3")}
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-800 dark:text-white font-medium">
                                    {tPaywall("comparison.yearly.feature4")}
                                </span>
                            </li>
                        </ul>
                        <Button
                            onClick={() => handleUpgradeClick("yearly")}
                            className="w-full h-11 text-sm font-semibold"
                        >
                            <Zap className="h-4 w-4 mr-2" />
                            {tPaywall("comparison.yearly.cta")}
                        </Button>
                    </div>

                    {/* Lifetime Plan Card (Founder's Edition) */}
                    <div
                        ref={lifetimeRef}
                        className={`scroll-mt-24 rounded-2xl border-2 p-6 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 relative overflow-hidden ${isLifetimeSelected ? "ring-2 ring-amber-500/30" : ""} border-amber-500 dark:border-amber-400`}
                    >
                        <div className="absolute top-2 right-2">
                            <div className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-semibold">
                                {tPaywall("comparison.foundersEdition")}
                            </div>
                        </div>
                        <div className="text-center mb-6 pt-8">
                            <h3 className="text-xl font-semibold text-secondary-black dark:text-white mb-2">
                                {tPaywall("comparison.lifetime.label")}
                            </h3>
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-4xl font-bold text-amber-600 dark:text-amber-400">
                                    {tPaywall("comparison.lifetime.price")}
                                </span>
                                <span className="text-gray-600 dark:text-gray-300 text-sm">
                                    {tPaywall("comparison.lifetime.period")}
                                </span>
                            </div>
                        </div>
                        <ul className="space-y-3 mb-4 min-h-[200px]">
                            <li className="flex items-start gap-3">
                                <Check className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-800 dark:text-white font-medium">
                                    {tPaywall("comparison.lifetime.feature1")}
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Check className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-800 dark:text-white font-medium">
                                    {tPaywall("comparison.lifetime.feature2")}
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Check className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-800 dark:text-white font-medium">
                                    {tPaywall("comparison.lifetime.feature3")}
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Check className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-800 dark:text-white font-medium">
                                    {tPaywall("comparison.lifetime.feature4")}
                                </span>
                            </li>
                        </ul>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 text-center">
                            {tPaywall("comparison.lifetime.fairUsage")}
                        </p>
                        <Button
                            onClick={() => handleUpgradeClick("lifetime")}
                            className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white border-0"
                        >
                            <Crown className="h-4 w-4 mr-2" />
                            {tPaywall("comparison.lifetime.cta")}
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
                </>
            )}
        </div>
    );
}
