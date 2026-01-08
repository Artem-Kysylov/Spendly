// Функциональный компонент: ToneSettings
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useTranslations } from "next-intl";
import type { AssistantTone } from "@/types/ai";
import type { ToastMessageProps } from "@/types/types";
import ToastMessage from "@/components/ui-elements/ToastMessage";
import Spinner from "@/components/ui-elements/Spinner";
import { useSubscription } from "@/hooks/useSubscription";
import { Link } from "@/i18n/routing";

const ToneSettings = () => {
  const tAI = useTranslations("assistant");
  const tN = useTranslations("notifications");
  const tCommon = useTranslations("common");
  const tCTA = useTranslations("cta");

  const [selectedTone, setSelectedTone] = useState<AssistantTone>("neutral");
  const [isUpdating, setIsUpdating] = useState(false);
  const [toast, setToast] = useState<ToastMessageProps | null>(null);

  const { subscriptionPlan } = useSubscription();
  const isFree = subscriptionPlan === "free";

  const toneOptions: Array<{
    value: AssistantTone;
    label: string;
    emoji: string;
  }> = isFree
    ? [{ value: "neutral", label: tAI("tone.options.neutral"), emoji: "😐" }]
    : [
        { value: "neutral", label: tAI("tone.options.neutral"), emoji: "😐" },
        { value: "formal", label: tAI("tone.options.formal"), emoji: "🧑‍💼" },
        { value: "friendly", label: tAI("tone.options.friendly"), emoji: "😊" },
        { value: "playful", label: tAI("tone.options.playful"), emoji: "😜" },
      ];

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const tone = (data?.user?.user_metadata as any)?.assistant_tone as
          | AssistantTone
          | undefined;
        if (isFree) {
          setSelectedTone("neutral");
        } else if (
          tone &&
          ["neutral", "friendly", "formal", "playful"].includes(tone)
        ) {
          setSelectedTone(tone);
        }
      } catch {
        /* no-op */
      }
    };
    init();
  }, [isFree]);

  const handleToneChange = async (tone: AssistantTone) => {
    if (isUpdating) return;
    // Блокируем выбор других тонов для Free
    if (isFree && tone !== "neutral") return;
    try {
      setIsUpdating(true);
      setSelectedTone(tone);
      await supabase.auth.updateUser({ data: { assistant_tone: tone } });
      setToast({ text: tN("toasts.preferencesSaved"), type: "success" });
    } catch (e) {
      console.error("Failed to update assistant tone:", e);
      setToast({ text: tN("toasts.preferencesSaveFailed"), type: "error" });
    } finally {
      setIsUpdating(false);
      setTimeout(() => setToast(null), 2500);
    }
  };

  return (
    <div className="relative space-y-4" aria-busy={isUpdating}>
      {toast && <ToastMessage {...toast} />}
      {isUpdating && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            <span>{tCommon("saving")}</span>
          </div>
        </div>
      )}

      {isFree && (
        <div className="rounded-md border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 p-3 text-sm text-blue-700 dark:text-blue-200">
          {tAI("settings.proOnlyHint")}{" "}
          <Link href={{ pathname: "/payment" }} className="underline">
            {tCTA("upgradeToPro")}
          </Link>
        </div>
      )}

      <div
        role="radiogroup"
        aria-label={tAI("tone.label")}
        className="space-y-3"
      >
        {toneOptions.map((option) => (
          <div
            key={option.value}
            role="radio"
            aria-checked={selectedTone === option.value}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleToneChange(option.value);
              }
            }}
            onClick={() => handleToneChange(option.value)}
            className={`
              p-4 rounded-lg border-2 transition-all duration-200
              ${selectedTone === option.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}
              ${isUpdating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              hover:shadow-sm hover:scale-[1.01]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
            `}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{option.emoji}</span>
              <div className="flex-1">
                <div className="font-medium text-foreground">
                  {option.label}
                </div>
              </div>
              {selectedTone === option.value && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-primary-foreground"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToneSettings;
