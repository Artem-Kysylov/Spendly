"use client";

import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isValidAmountInput, parseAmountInput } from "@/lib/utils";
import Button from "../ui-elements/Button";
import TextInput from "../ui-elements/TextInput";

interface BudgetFormProps {
  initialData?: {
    emoji?: string;
    name?: string;
    amount?: number;
    type?: "expense" | "income";
    color_code?: string | null;
    rolloverEnabled?: boolean;
    rolloverMode?: "positive-only" | "allow-negative";
    rolloverCap?: number | null;
  };
  onSubmit: (
    emoji: string,
    name: string,
    amount: number,
    type: "expense" | "income",
    color_code?: string | null,
    rolloverEnabled?: boolean,
    rolloverMode?: "positive-only" | "allow-negative",
    rolloverCap?: number | null,
  ) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
  className?: string; // To allow external styling adjustments if needed
}

export default function BudgetForm({
  initialData,
  onSubmit,
  isLoading = false,
  className = "",
}: BudgetFormProps) {
  const tModals = useTranslations("modals");
  const tCommon = useTranslations("common");
  const tTransactions = useTranslations("transactions");
  const tBudgets = useTranslations("budgets");
  const tAll = useTranslations();

  // Helper for rollover translations
  const tRollover = (key: string) => {
    const value = tBudgets(`rollover.${key}`);
    return value === `rollover.${key}`
      ? tAll(`budgets.rollover.${key}`)
      : value;
  };

  const [emojiIcon, setEmojiIcon] = useState(initialData?.emoji || "💰");
  const [name, setName] = useState(initialData?.name || "");
  const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
  const [type, setType] = useState<"expense" | "income">(
    initialData?.type || "expense",
  );
  const [openEmojiPicker, setOpenEmojiPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(
    initialData?.color_code ?? null,
  );

  const [rolloverEnabled, setRolloverEnabled] = useState<boolean>(
    initialData?.rolloverEnabled ?? true,
  );
  const [rolloverMode, setRolloverMode] = useState<
    "positive-only" | "allow-negative"
  >(initialData?.rolloverMode ?? "positive-only");

  const COLOR_OPTIONS: Array<string | null> = [
    null,
    "FFA09A",
    "9CFFB4",
    "96CBFF",
    "FFEE98",
    "E0A3FF",
  ];

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;
    if (!isValidAmountInput(amount)) return;

    await onSubmit(
      emojiIcon,
      name.trim(),
      parseAmountInput(amount),
      type,
      selectedColor,
      type === "expense" ? rolloverEnabled : false,
      type === "expense" ? rolloverMode : undefined,
      undefined, // cap placeholder
    );
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex-1 overflow-y-auto px-1 hide-scrollbar">
        <Tabs
          value={type}
          onValueChange={(v) => setType(v as "expense" | "income")}
          className="mb-4 flex justify-center"
        >
          <TabsList className="mx-auto gap-2">
            <TabsTrigger
              value="expense"
              className="data-[state=active]:bg-error data-[state=active]:text-error-foreground"
            >
              {tModals("budget.type.expense")}
            </TabsTrigger>
            <TabsTrigger
              value="income"
              className="data-[state=active]:bg-success data-[state=active]:text-success-foreground"
            >
              {tModals("budget.type.income")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Emoji + Name */}
        <div className="flex items-center gap-2 mb-5 relative z-[10]">
          <Button
            text={emojiIcon}
            className="flex h-[60px] w-[60px] items-center justify-center rounded-lg border-none bg-[#F5F3FF] text-[25px] text-primary transition-opacity duration-300 hover:opacity-50 dark:bg-background shrink-0"
            onClick={() => setOpenEmojiPicker(true)}
            type="button"
          />
          <TextInput
            type="text"
            placeholder={tModals("budget.placeholder.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
        </div>

        {/* Floating Emoji Picker */}
        <div className="relative z-[20]">
          {openEmojiPicker && (
            <div className="absolute top-[-60px] right-0 shadow-xl rounded-xl z-[100]">
              {/* Overlay to close */}
              <button
                type="button"
                className="fixed inset-0 z-[-1]"
                onClick={() => setOpenEmojiPicker(false)}
                aria-label="Close emoji picker"
              />
              <EmojiPicker
                open={true}
                onEmojiClick={(e: EmojiClickData) => {
                  setEmojiIcon(e.emoji);
                  setOpenEmojiPicker(false);
                }}
              />
            </div>
          )}
        </div>

        {/* Color picker */}
        <div className="flex flex-col items-center gap-3 mb-5">
          <div className="text-sm font-medium text-center text-secondary-black dark:text-white">
            {tModals("budget.pickColor")}
          </div>
          <div className="flex justify-center gap-3 flex-wrap">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color ?? "none"}
                type="button"
                onClick={() => setSelectedColor(color)}
                aria-label={color ? `#${color}` : tModals("budget.color.none")}
                title={color ? `#${color}` : tModals("budget.color.none")}
                className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-200 ease-in-out ${selectedColor === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "border-border"}`}
                style={{
                  backgroundColor: color ? `#${color}` : "transparent",
                }}
              >
                {!color && (
                  <div className="h-full w-full rounded-full bg-no-color-swatch flex items-center justify-center relative">
                    <span className="block w-full h-[1px] bg-foreground/50 rotate-45 transform scale-x-125" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextInput
            type="text"
            placeholder={tTransactions("table.headers.amount")}
            value={amount}
            onChange={handleAmountChange}
            disabled={isLoading}
            inputMode="decimal"
            className={
              type === "expense"
                ? "text-error text-2xl font-medium"
                : "text-success text-2xl font-medium"
            }
          />

          {type === "expense" && (
            <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
              <div className="text-sm font-medium">
                {tRollover("panelTitle")}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {tRollover("toggleLabel")}
                </span>
                <button
                  type="button"
                  onClick={() => setRolloverEnabled((v) => !v)}
                  className={`w-10 h-6 rounded-full ${rolloverEnabled ? "bg-primary" : "bg-muted"} relative transition-colors`}
                  aria-pressed={rolloverEnabled}
                >
                  <span
                    className={`absolute top-0.5 ${rolloverEnabled ? "left-5" : "left-1"} w-5 h-5 rounded-full bg-white transition-all`}
                  />
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">
                  {tRollover("modeLabel")}
                </span>
                <div className="relative">
                  <select
                    value={rolloverMode}
                    onChange={(e) =>
                      setRolloverMode(
                        e.target.value as "positive-only" | "allow-negative",
                      )
                    }
                    disabled={!rolloverEnabled}
                    className="w-full bg-background text-foreground h-10 px-3 border border-input rounded-md appearance-none disabled:opacity-50"
                  >
                    <option value="positive-only">
                      {tRollover("positiveOnly")}
                    </option>
                    <option value="allow-negative">
                      {tRollover("allowNegative")}
                    </option>
                  </select>
                  {/* Custom arrow if needed, but standard select is fine for mobile/desktop hybrid */}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 pb-1">
            <Button
              type="submit"
              text={isLoading ? tCommon("saving") : tCommon("submit")}
              variant="default"
              disabled={isLoading || !name.trim() || !amount}
              className={`w-full ${type === "expense" ? "bg-error text-error-foreground" : "bg-success text-success-foreground"}`}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
