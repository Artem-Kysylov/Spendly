"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { UserAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { detectInitialLocale } from "@/i18n/detect";
import type { Language, UserLocaleSettings } from "@/types/locale";
import LanguageSelect from "@/components/ui-elements/locale/LanguageSelect";
import CountryCombobox from "@/components/ui-elements/locale/CountryCombobox";
import CurrencyCombobox from "@/components/ui-elements/locale/CurrencyCombobox";
import TransactionModal from "@/components/modals/TransactionModal";
import CreateMainBudget from "@/components/budgets/CreateMainBudget";
import ToastMessage from "@/components/ui-elements/ToastMessage";
import { Button } from "@/components/ui/button";
import { saveUserLocaleSettings } from "@/app/[locale]/actions/saveUserLocaleSettings";

type Step = 0 | 1 | 2 | 3;

export default function ChatOnboarding() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const { session } = UserAuth();

  const [step, setStep] = useState<Step>(0);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Locale state
  const [language, setLanguage] = useState<Language>("en");
  const [country, setCountry] = useState<string>("US");
  const [currency, setCurrency] = useState<string>("USD");
  const [autodetected, setAutodetected] = useState<boolean>(false);

  // Transaction modal state
  const [isTxOpen, setTxOpen] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    detectInitialLocale().then((s) => {
      if (!active) return;
      setLanguage(s.locale);
      setCountry(s.country);
      setCurrency(s.currency);
      setAutodetected(!!s.autodetected);
    });
    return () => {
      active = false;
    };
  }, []);

  const showToast = (text: string, type: "success" | "error") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Ensure step updates always return a valid union type
  const clampStep = (n: number): Step => (n <= 0 ? 0 : n >= 3 ? 3 : (n as Step));

  // Handle language change (updates locale path)
  const handleLanguageChange = useCallback(
    (lang: Language) => {
      setLanguage(lang);
      try {
        router.replace("/onboarding", { locale: lang });
      } catch (e) {
        // ignore routing errors in dev
      }
    },
    [router],
  );

  const handleNext = useCallback(async () => {
    // Step-specific side effects
    if (step === 1) {
      // Persist locale settings after Step 2
      if (session?.user?.id) {
        try {
          await saveUserLocaleSettings({
            userId: session.user.id,
            country,
            currency,
            locale: language,
          });
        } catch (e) {
          console.warn("Failed to save locale settings during onboarding", e);
        }
      }
    }
    setStep((s) => clampStep(s + 1));
  }, [step, session?.user?.id, country, currency, language]);

  const handleBack = useCallback(() => {
    setStep((s) => clampStep(s - 1));
  }, []);

  const markCompleted = useCallback(async () => {
    try {
      if (session?.user) {
        await supabase.auth.updateUser({
          data: { onboarding_completed: true },
        });
      }
    } catch {}
  }, [session?.user]);

  const handleFinish = useCallback(async () => {
    await markCompleted();
    router.push("/dashboard");
  }, [markCompleted, router]);

  const headerTitle = useMemo(() => t("title"), [t]);

  return (
    <div className="min-h-screen bg-background text-foreground grid grid-rows-[auto_1fr_auto]">
      {/* Header with language switch */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">{headerTitle}</span>
          {autodetected ? (
            <span className="ml-2 text-xs text-muted-foreground">{t("autodetected")}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <LanguageSelect value={language} onChange={handleLanguageChange} />
        </div>
      </div>

      {/* Chat Body */}
      <div className="overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 space-y-6">
          {/* Step Intro */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted p-4">
                <p className="text-sm leading-relaxed">{t("intro.welcome")}</p>
              </div>
              <div className="rounded-xl bg-muted p-4">
                <p className="text-sm leading-relaxed">{t("intro.firstTransactionPrompt")}</p>
                <div className="mt-3">
                  <Button onClick={() => setTxOpen(true)}>{t("actions.addFirstTransaction")}</Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Currency */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted p-4">
                <p className="text-sm leading-relaxed">{t("currency.choosePrompt")}</p>
                <div className="mt-3 flex gap-3">
                  <CountryCombobox value={country} onChange={setCountry} />
                  <CurrencyCombobox value={currency} countryCode={country} onChange={setCurrency} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Budget */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted p-4">
                <p className="text-sm leading-relaxed">{t("budget.createPrompt")}</p>
                <div className="mt-4">
                  <CreateMainBudget
                    onSubmit={async (amount: string, localeSettings?: UserLocaleSettings) => {
                      if (!session?.user?.id) {
                        showToast(t("errors.authRequired"), "error");
                        return;
                      }
                      try {
                        const { data, error } = await supabase
                          .from("main_budget")
                          .upsert(
                            {
                              user_id: session.user.id,
                              amount: Number(amount),
                            },
                            { onConflict: "user_id" },
                          )
                          .select();

                        if (error) {
                          showToast(t("errors.budgetSaveFailed"), "error");
                          return;
                        }

                        // Persist locale settings too
                        if (localeSettings) {
                          try {
                            await saveUserLocaleSettings({
                              userId: session.user.id,
                              country: localeSettings.country,
                              currency: localeSettings.currency,
                              locale: localeSettings.locale,
                            });
                          } catch {}
                        }

                        showToast(t("budget.saved"), "success");
                        setStep((s) => clampStep(s + 1));
                      } catch (e) {
                        showToast(t("errors.unexpected"), "error");
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Finish */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted p-4">
                <p className="text-sm leading-relaxed">{t("finish.summary")}</p>
                <div className="mt-3">
                  <Button onClick={handleFinish}>{t("actions.finish")}</Button>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Modal */}
          {isTxOpen && (
            <TransactionModal
              title={t("transaction.modalTitle")}
              onClose={() => setTxOpen(false)}
              onSubmit={(text, type) => {
                if (type === "success") {
                  showToast(t("transaction.added"), "success");
                  setTxOpen(false);
                  setStep(1);
                } else {
                  showToast(text, "error");
                }
              }}
              initialBudgetId={undefined}
              initialData={undefined}
              allowTypeChange
            />
          )}
        </div>
      </div>

      {/* Footer controls */}
      <div className="flex items-center justify-between p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleBack} disabled={step === 0}>
            {t("actions.back")}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {step < 3 ? (
            <Button onClick={handleNext}>{t("actions.next")}</Button>
          ) : (
            <Button onClick={handleFinish}>{t("actions.finish")}</Button>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast ? (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md">
          <ToastMessage text={toast.text} type={toast.type} />
        </div>
      ) : null}
    </div>
  );
}
