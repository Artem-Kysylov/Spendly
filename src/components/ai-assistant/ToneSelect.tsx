"use client";

import { useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import useDeviceType from "@/hooks/useDeviceType";

type Tone = "neutral" | "friendly" | "formal" | "playful";

interface ToneSelectProps {
  value: Tone;
  onChange: (tone: Tone) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

const toneEmoji: Record<Tone, string> = {
  neutral: "😐",
  friendly: "😊",
  formal: "🧑‍💼",
  playful: "😜",
};

export function ToneSelect({
  value,
  onChange,
  disabled,
  className,
  ...props
}: ToneSelectProps) {
  const [open, setOpen] = useState(false);
  const tAI = useTranslations("assistant");
  const { isMobile } = useDeviceType();

  const items: Tone[] = ["neutral", "formal", "friendly", "playful"];

  const triggerButton = (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground",
        "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="flex items-center gap-2">
        <span>{toneEmoji[value]}</span>
        <span>
          {value === "neutral" && tAI("tone.options.neutral")}
          {value === "formal" && tAI("tone.options.formal")}
          {value === "friendly" && tAI("tone.options.friendly")}
          {value === "playful" && tAI("tone.options.playful")}
        </span>
      </span>
      <svg
        width="24"
        height="24"
        viewBox="0 0 20 20"
        className="text-black dark:text-white"
      >
        <path
          d="M14.77 12.79a.75.75 0 01-1.06-.02L10 9.06l-3.71 3.71a.75.75 0 11-1.06-1.06l4.24-4.24a.75.75 0 011.06 0l4.24 4.24c.29.29.29.77 0 1.08z"
          fill="currentColor"
        />
      </svg>
    </button>
  );

  const optionsList = (
    <div className="space-y-3">
      {items.map((tone) => (
        <button
          key={tone}
          type="button"
          className={cn(
            "flex w-full items-center gap-3 rounded-lg border-2 p-4 text-left transition-all duration-200",
            tone === value
              ? "border-primary bg-primary/10"
              : "border-border bg-background hover:bg-muted/60",
          )}
          onClick={async () => {
            await onChange(tone);
            setOpen(false);
          }}
        >
          <span className="text-2xl leading-none">{toneEmoji[tone]}</span>
          <span className="flex-1 font-medium text-foreground">
            {tone === "neutral" && tAI("tone.options.neutral")}
            {tone === "formal" && tAI("tone.options.formal")}
            {tone === "friendly" && tAI("tone.options.friendly")}
            {tone === "playful" && tAI("tone.options.playful")}
          </span>
          {tone === value && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <svg
                className="h-3 w-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          )}
        </button>
      ))}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground",
            "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        >
          <span className="flex items-center gap-2">
            <span>{toneEmoji[value]}</span>
            <span>
              {value === "neutral" && tAI("tone.options.neutral")}
              {value === "formal" && tAI("tone.options.formal")}
              {value === "friendly" && tAI("tone.options.friendly")}
              {value === "playful" && tAI("tone.options.playful")}
            </span>
          </span>
          <svg
            width="24"
            height="24"
            viewBox="0 0 20 20"
            className="text-black dark:text-white"
          >
            <path
              d="M14.77 12.79a.75.75 0 01-1.06-.02L10 9.06l-3.71 3.71a.75.75 0 11-1.06-1.06l4.24-4.24a.75.75 0 011.06 0l4.24 4.24c.29.29.29.77 0 1.08z"
              fill="currentColor"
            />
          </svg>
        </button>
        <SheetContent side="bottom" className="h-[50dvh] rounded-t-[28px] p-0">
          <div className="flex h-full flex-col overflow-hidden p-4">
            <div className="mb-4 text-center">
              <h3 className="text-2xl font-semibold">{tAI("settings.title")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {tAI("settings.description")}
              </p>
            </div>
            <div className="overflow-y-auto pb-2">{optionsList}</div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {triggerButton}
      </PopoverTrigger>
      <PopoverContent side="top" sideOffset={6} className="w-[320px] p-3">
        {optionsList}
      </PopoverContent>
    </Popover>
  );
}
