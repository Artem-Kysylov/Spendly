"use client";

import { ChatPreset } from "@/types/types";
import { useTranslations } from "next-intl";
import useDeviceType from "@/hooks/useDeviceType";
import { cn } from "@/lib/utils";

interface PresetButtonsProps {
  onSelectPreset: (prompt: string) => Promise<void>;
  title?: string;
  className?: string;
  limit?: number;
}

const buildPresets = (t: ReturnType<typeof useTranslations>): ChatPreset[] => [
  { id: "1", title: t("presets.showWeek"), prompt: t("presets.showWeek") },
  { id: "2", title: t("presets.saveMoney"), prompt: t("presets.saveMoney") },
  {
    id: "3",
    title: t("presets.analyzePatterns"),
    prompt: t("presets.analyzePatterns"),
  },
  {
    id: "4",
    title: t("presets.createBudgetPlan"),
    prompt: t("presets.createBudgetPlan"),
  },
  {
    id: "5",
    title: t("presets.showBiggest"),
    prompt: t("presets.showBiggest"),
  },
  {
    id: "6",
    title: t("presets.compareMonths"),
    prompt: t("presets.compareMonths"),
  },
];

export default function PresetButtons({
  onSelectPreset,
  title,
  className,
  limit,
}: PresetButtonsProps) {
  const tAI = useTranslations("assistant");
  const { isMobile } = useDeviceType();
  const paddingY = isMobile ? "py-[15px]" : "py-2.5";
  const items = buildPresets(tAI);
  const shown = typeof limit === "number" ? items.slice(0, limit) : items;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-medium text-secondary-black dark:text-white mb-3 text-center">
        {title ?? tAI("presets.header")}
      </p>
      <div className="grid grid-cols-2 gap-3 justify-items-stretch">
        {shown.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelectPreset(preset.prompt)}
            className={cn(
              "w-full inline-flex items-center justify-center text-center",
              "px-4 text-xs",
              "bg-primary/10 hover:bg-primary/40 text-primary",
              "rounded-full transition-all duration-200 border border-primary touch-manipulation",
              paddingY,
            )}
          >
            {preset.title}
          </button>
        ))}
      </div>
    </div>
  );
}
