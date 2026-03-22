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
  SheetTrigger,
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
    <div className="grid gap-1">
      {items.map((tone) => (
        <button
          key={tone}
          type="button"
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm",
            "hover:bg-muted text-foreground",
            tone === value ? "bg-muted" : "",
          )}
          onClick={async () => {
            await onChange(tone);
            setOpen(false);
          }}
        >
          <span>{toneEmoji[tone]}</span>
          <span>
            {tone === "neutral" && tAI("tone.options.neutral")}
            {tone === "formal" && tAI("tone.options.formal")}
            {tone === "friendly" && tAI("tone.options.friendly")}
            {tone === "playful" && tAI("tone.options.playful")}
          </span>
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
        <SheetContent side="bottom" className="p-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">{tAI("tone.label")}</h3>
            <p className="text-sm text-muted-foreground mt-1">{tAI("tone.description")}</p>
          </div>
          {optionsList}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {triggerButton}
      </PopoverTrigger>
      <PopoverContent side="top" sideOffset={6} className="w-[260px] p-1">
        {optionsList}
      </PopoverContent>
    </Popover>
  );
}
