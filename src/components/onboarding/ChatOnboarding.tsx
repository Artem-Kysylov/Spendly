"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { UserAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { detectInitialLocale } from "@/i18n/detect";
import type { Language } from "@/types/locale";
import LanguageSelect from "@/components/ui-elements/locale/LanguageSelect";
import ToastMessage from "@/components/ui-elements/ToastMessage";
import { Button } from "@/components/ui/button";
import { saveUserLocaleSettings } from "@/app/[locale]/actions/saveUserLocaleSettings";
import { cn } from "@/lib/utils";
import { Coffee, UtensilsCrossed, Car, ShoppingCart, Wallet, Scale, Sparkles } from "lucide-react";

type Step = 0 | 1 | 2 | 3;
type BudgetStyle = "monk" | "balanced" | "rich";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  isTyping?: boolean;
}

const CURRENCY_OPTIONS = [
  { code: "USD", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", symbol: "€", flag: "🇪🇺" },
  { code: "UAH", symbol: "₴", flag: "🇺🇦" },
  { code: "IDR", symbol: "Rp", flag: "🇮🇩" },
  { code: "JPY", symbol: "¥", flag: "🇯🇵" },
  { code: "KRW", symbol: "₩", flag: "🇰🇷" },
  { code: "INR", symbol: "₹", flag: "🇮🇳" },
  { code: "RUB", symbol: "₽", flag: "🇷🇺" },
];

const BUDGET_AMOUNTS: Record<string, Record<BudgetStyle, number>> = {
  USD: { monk: 500, balanced: 1500, rich: 5000 },
  EUR: { monk: 450, balanced: 1400, rich: 4500 },
  UAH: { monk: 15000, balanced: 45000, rich: 150000 },
  IDR: { monk: 7500000, balanced: 22500000, rich: 75000000 },
  JPY: { monk: 75000, balanced: 225000, rich: 750000 },
  KRW: { monk: 650000, balanced: 2000000, rich: 6500000 },
  INR: { monk: 40000, balanced: 120000, rich: 400000 },
  RUB: { monk: 45000, balanced: 135000, rich: 450000 },
};

const LANGUAGE_CURRENCY_MAP: Record<string, string> = {
  uk: "UAH",
  ru: "RUB",
  ja: "JPY",
  ko: "KRW",
  id: "IDR",
  hi: "INR",
};

export default function ChatOnboarding() {
  const t = useTranslations("onboarding");
  const currentLocale = useLocale() as Language;
  const router = useRouter();
  const { session } = UserAuth();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Locale state
  const [language, setLanguage] = useState<Language>(currentLocale);
  const [currency, setCurrency] = useState<string>("USD");
  const [autodetected, setAutodetected] = useState<boolean>(false);

  // Transaction state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [transactionAmount, setTransactionAmount] = useState<string>("");

  // Budget style state
  const [selectedBudgetStyle, setSelectedBudgetStyle] = useState<BudgetStyle | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Detect locale on mount and sync with URL
  useEffect(() => {
    let active = true;
    detectInitialLocale().then((s) => {
      if (!active) return;
      // If detected locale differs from URL, redirect
      if (s.locale !== currentLocale && s.autodetected) {
        router.replace("/onboarding", { locale: s.locale });
      }
      setLanguage(currentLocale);
      setCurrency(s.currency);
      setAutodetected(!!s.autodetected);
    });
    return () => {
      active = false;
    };
  }, [currentLocale, router]);

  // Add initial greeting when component mounts
  const greetingRef = useRef(false);
  useEffect(() => {
    if (greetingRef.current) return;
    greetingRef.current = true;
    
    const timer = setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages([{ id: "greeting", role: "assistant", content: t("step1.greeting") }]);
      }, 800 + Math.random() * 400);
    }, 500);
    return () => clearTimeout(timer);
  }, [t]);

  const showToast = (text: string, type: "success" | "error") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const addBotMessage = useCallback((content: string) => {
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: `bot-${Date.now()}`, role: "assistant", content },
      ]);
    }, 800 + Math.random() * 400);
  }, []);

  const addUserMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content },
    ]);
  }, []);

  // Handle language change
  const handleLanguageChange = useCallback(
    (lang: Language) => {
      setLanguage(lang);
      // Auto-select currency based on language
      const suggestedCurrency = LANGUAGE_CURRENCY_MAP[lang] || "USD";
      setCurrency(suggestedCurrency);
      try {
        router.replace("/onboarding", { locale: lang });
      } catch (e) {
        // ignore routing errors
      }
    },
    [router],
  );

  // Handle category selection (Step 1)
  const handleCategorySelect = useCallback((category: string, label: string) => {
    setSelectedCategory(category);
    addUserMessage(label);
  }, [addUserMessage]);

  // Handle amount submit (Step 1 -> Step 2)
  const handleAmountSubmit = useCallback(() => {
    if (!transactionAmount || !selectedCategory) return;
    
    addUserMessage(`${currency} ${transactionAmount}`);
    
    setTimeout(() => {
      setStep(1);
      addBotMessage(t("step2.currency_question"));
    }, 300);
  }, [transactionAmount, selectedCategory, currency, addBotMessage, addUserMessage, t]);

  // Handle currency selection (Step 2 -> Step 3)
  const handleCurrencySelect = useCallback((currencyCode: string, flag: string) => {
    setCurrency(currencyCode);
    addUserMessage(`${flag} ${currencyCode}`);
    
    setTimeout(() => {
      setStep(2);
      addBotMessage(t("step3.budget_question"));
    }, 300);
  }, [addBotMessage, addUserMessage, t]);

  // Handle budget style selection (Step 3 -> Step 4)
  const handleBudgetStyleSelect = useCallback(async (style: BudgetStyle, label: string) => {
    setSelectedBudgetStyle(style);
    addUserMessage(label);

    // Save everything
    if (!session?.user?.id) {
      showToast(t("errors.authRequired"), "error");
      return;
    }

    try {
      // Save locale settings
      await saveUserLocaleSettings({
        userId: session.user.id,
        country: "US",
        currency,
        locale: language,
      });

      // Calculate budget amount
      const budgetAmount = BUDGET_AMOUNTS[currency]?.[style] || BUDGET_AMOUNTS.USD[style];

      // Save main budget
      const { error } = await supabase
        .from("main_budget")
        .upsert(
          { user_id: session.user.id, amount: budgetAmount },
          { onConflict: "user_id" },
        );

      if (error) {
        console.error("Budget save error:", error);
        showToast(t("errors.budgetSaveFailed"), "error");
        return;
      }

      // Save first transaction if we have one
      if (selectedCategory && transactionAmount) {
        const { error: txError } = await supabase.from("transactions").insert({
          user_id: session.user.id,
          title: selectedCategory,
          amount: Number(transactionAmount),
          type: "expense",
          date: new Date().toISOString(),
        });
        
        if (txError) {
          console.warn("Transaction save failed:", txError);
          // Don't block onboarding if transaction fails
        }
      }

      // Success - move to next step
      setTimeout(() => {
        setStep(3);
        addBotMessage(t("step4.processing"));
      }, 300);
    } catch (e) {
      console.error("Failed to save onboarding data", e);
      showToast(t("errors.unexpected"), "error");
    }
  }, [session?.user?.id, currency, language, addBotMessage, addUserMessage, t, showToast]);

  // Handle finish
  const handleFinish = useCallback(async () => {
    try {
      if (session?.user) {
        await supabase.auth.updateUser({
          data: { onboarding_completed: true },
        });
      }
    } catch {}
    router.push("/dashboard");
  }, [session?.user, router]);

  const categories = [
    { id: "coffee", label: t("step1.action_coffee"), icon: Coffee, emoji: "☕" },
    { id: "food", label: t("step1.action_food"), icon: UtensilsCrossed, emoji: "🍔" },
    { id: "taxi", label: t("step1.action_taxi"), icon: Car, emoji: "🚕" },
    { id: "groceries", label: t("step1.action_groceries"), icon: ShoppingCart, emoji: "🛒" },
  ];

  const budgetStyles = [
    { id: "monk" as BudgetStyle, label: t("step3.style_monk"), desc: t("step3.style_monk_desc"), icon: Wallet, emoji: "🧘" },
    { id: "balanced" as BudgetStyle, label: t("step3.style_balanced"), desc: t("step3.style_balanced_desc"), icon: Scale, emoji: "⚖️" },
    { id: "rich" as BudgetStyle, label: t("step3.style_rich"), desc: t("step3.style_rich_desc"), icon: Sparkles, emoji: "💎" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative">
      {/* Floating Language Switcher */}
      <div className="fixed top-4 right-4 z-50 flex flex-col items-end">
        <LanguageSelect value={language} onChange={handleLanguageChange} />
        {autodetected && (
          <span className="block text-xs text-muted-foreground mt-1">
            {t("autodetected")}
          </span>
        )}
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto pb-4">
        <div className="max-w-2xl mx-auto p-4 pt-16 space-y-4">
          {/* Chat Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex flex-col max-w-[85%]",
                message.role === "user" ? "self-end items-end ml-auto" : "self-start items-start"
              )}
            >
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 shadow-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50"
                )}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="self-start flex items-center gap-2 p-4 bg-muted/50 rounded-2xl w-16">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
            </div>
          )}

          {/* Step 1: Category Selection */}
          {step === 0 && !isTyping && messages.length > 0 && !selectedCategory && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id, cat.label)}
                  className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-colors text-left"
                >
                  <span className="text-2xl">{cat.emoji}</span>
                  <span className="text-sm font-medium">{cat.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 1: Amount Input */}
          {step === 0 && selectedCategory && !isTyping && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{currency}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder={t("step1.amount_placeholder")}
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-2xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>
              <Button
                onClick={handleAmountSubmit}
                disabled={!transactionAmount}
                className="w-full"
              >
                {t("actions.next")}
              </Button>
            </div>
          )}

          {/* Step 2: Currency Selection */}
          {step === 1 && !isTyping && (
            <div className="flex flex-wrap gap-2 mt-4">
              {CURRENCY_OPTIONS.map((curr) => (
                <button
                  key={curr.code}
                  type="button"
                  onClick={() => handleCurrencySelect(curr.code, curr.flag)}
                  className={cn(
                    "px-4 py-2 rounded-full border transition-colors",
                    currency === curr.code
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:bg-muted/50"
                  )}
                >
                  <span className="mr-1">{curr.flag}</span>
                  <span className="text-sm font-medium">{curr.code}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Budget Style Selection */}
          {step === 2 && !isTyping && (
            <div className="space-y-3 mt-4">
              {budgetStyles.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => handleBudgetStyleSelect(style.id, style.label)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl border transition-colors text-left",
                    selectedBudgetStyle === style.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-muted/50"
                  )}
                >
                  <span className="text-3xl">{style.emoji}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{style.label}</div>
                    <div className="text-sm text-muted-foreground">{style.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 4: Finish */}
          {step === 3 && !isTyping && (
            <div className="mt-4">
              <Button onClick={handleFinish} className="w-full" size="lg">
                {t("step4.finish_button")}
              </Button>
            </div>
          )}

          <div ref={chatEndRef} className="h-1" />
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md z-50">
          <ToastMessage text={toast.text} type={toast.type} />
        </div>
      )}
    </div>
  );
}
