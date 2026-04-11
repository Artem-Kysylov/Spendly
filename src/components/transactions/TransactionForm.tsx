"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/ui-elements/Button";
import HybridDatePicker from "@/components/ui-elements/HybridDatePicker";
import TextInput from "@/components/ui-elements/TextInput";
import { UserAuth } from "@/context/AuthContext";
import { useRecurringRule } from "@/hooks/useRecurringRule";
import { useSubscription } from "@/hooks/useSubscription";
import useDeviceType from "@/hooks/useDeviceType";
import { checkMainBudgetThresholds } from "@/lib/budget/checkMainBudgetThresholds";
import { formatDateOnly, mergeDateWithTime, toOffsetISOString } from "@/lib/dateUtils";
import { supabase } from "@/lib/supabaseClient";
import { isValidAmountInput, parseAmountInput } from "@/lib/utils";
import { checkBudgetThresholds } from "@/lib/budget/checkThresholds";
import type { BudgetFolderItemProps, Transaction } from "@/types/types";
import type { Language } from "@/types/locale";

// Schema definition
const transactionSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  title: z.string().min(1, "Title is required"),
  type: z.enum(["expense", "income"]),
  budget_folder_id: z.string().nullable(),
  created_at: z.date(),
  saveAsTemplate: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceDay: z.number().min(1).max(31).nullable().optional(),
  recurrenceCadence: z.enum(["weekly", "monthly"]).optional(),
  nextDueDate: z.date().nullable().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

type TemplateRow = {
  id: string;
  title: string;
  amount: number;
  type: "expense" | "income";
  budget_folder_id: string | null;
};

interface TransactionFormProps {
  initialData?: Partial<Transaction>;
  initialBudgetId?: string;
  onSuccess: () => void;
  onCancel?: () => void;
  allowTypeChange?: boolean;
}

export default function TransactionForm({
  initialData,
  initialBudgetId,
  onSuccess,
  onCancel: _onCancel,
  allowTypeChange = true,
}: TransactionFormProps) {
  const { session } = UserAuth();
  const locale = useLocale() as Language;
  const tModals = useTranslations("modals");
  const tCommon = useTranslations("common");
  const tTransactions = useTranslations("transactions");
  const tSettings = useTranslations("userSettings");
  const { toast } = useToast();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [budgetFolders, setBudgetFolders] = useState<BudgetFolderItemProps[]>(
    [],
  );
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [recentTitles, setRecentTitles] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [_isBudgetsLoading, setIsBudgetsLoading] = useState(false);
  const [isTypeDisabled, setIsTypeDisabled] = useState(!allowTypeChange);
  const [isBudgetSheetOpen, setIsBudgetSheetOpen] = useState(false);

  const amountRef = useRef<HTMLInputElement | null>(null);
  const { isMobile } = useDeviceType();

  const { subscriptionPlan } = useSubscription();
  const isPro = subscriptionPlan === "pro";
  const recurringRuleId = initialData?.recurring_rule_id ?? null;
  const recurringRuleLookup = initialData
    ? {
        title: initialData.title ?? "",
        amount: Number(initialData.amount ?? 0),
        type: initialData.type ?? "expense",
        budgetFolderId: initialData.budget_folder_id ?? null,
      }
    : undefined;
  const {
    recurringRule,
    isLoading: isRecurringRuleLoading,
    updateRecurringRule,
  } = useRecurringRule(recurringRuleId, recurringRuleLookup);
  const effectiveRecurringRuleId = recurringRuleId ?? recurringRule?.id ?? null;
  const hasRecurringRule = Boolean(effectiveRecurringRuleId);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: initialData?.amount?.toString() || "",
      title: initialData?.title || "",
      type: initialData?.type || "expense",
      budget_folder_id:
        initialData?.budget_folder_id || initialBudgetId || "unbudgeted",
      created_at: initialData?.created_at
        ? new Date(initialData.created_at)
        : new Date(),
      saveAsTemplate: false,
      isRecurring: initialData?.is_recurring || hasRecurringRule,
      recurrenceDay: initialData?.recurrence_day || new Date().getDate(),
      recurrenceCadence: "monthly",
      nextDueDate: initialData?.created_at ? new Date(initialData.created_at) : new Date(),
    },
  });

  const { control, handleSubmit, watch, setValue } = form;
  const currentType = watch("type");
  const currentTitle = watch("title");
  const isRecurring = watch("isRecurring");
  const [recurringCount, setRecurringCount] = useState(0);

  useEffect(() => {
    if (!recurringRule) return;

    setValue("isRecurring", true);
    setValue("recurrenceCadence", recurringRule.cadence);
    setValue("nextDueDate", parseDateOnly(recurringRule.next_due_date));
  }, [recurringRule, setValue]);

  // Fetch Data
  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchData = async () => {
      setIsBudgetsLoading(true);
      try {
        // Budgets
        const { data: budgets } = await supabase
          .from("budget_folders")
          .select("id, emoji, name, amount, type, color_code")
          .eq("user_id", session.user.id)
          .order("name", { ascending: true });

        if (budgets) setBudgetFolders(budgets as BudgetFolderItemProps[]);

        // Templates
        const { data: tpls } = await supabase
          .from("transaction_templates")
          .select("*")
          .eq("user_id", session.user.id)
          .order("updated_at", { ascending: false });

        if (tpls) setTemplates(tpls as TemplateRow[]);

        // Recent Titles
        const { data: recents } = await supabase
          .from("transactions")
          .select("title")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        const recentRows = (recents || []) as Array<{ title: string | null }>;
        const uniq = Array.from(
          new Set(
            recentRows.map((r) => r.title).filter((t): t is string => !!t),
          ),
        );
        setRecentTitles(uniq as string[]);

        // Recurring transactions count (for free tier limits)
        const { count } = await supabase
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session.user.id)
          .eq("is_recurring", true);

        setRecurringCount(count || 0);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsBudgetsLoading(false);
      }
    };

    fetchData();
  }, [session?.user?.id]);

  const normalizeTitle = (raw: string): string => {
    const s = (raw || "").toLowerCase();
    return s.replace(/[^\p{L}\p{N}\s]/gu, " ").trim();
  };

  const parseDateOnly = (value: string): Date => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  };

  const applyBudgetId = useCallback(
    (budgetId: string) => {
      setValue("budget_folder_id", budgetId);
      if (budgetId === "unbudgeted") {
        setIsTypeDisabled(false);
      } else {
        const selectedBudget = budgetFolders.find((b) => b.id === budgetId);
        if (selectedBudget) {
          setValue("type", selectedBudget.type);
          setIsTypeDisabled(true);
        }
      }
    },
    [budgetFolders, setValue],
  );

  // Apply initial budget
  useEffect(() => {
    if (initialBudgetId && budgetFolders.length > 0) {
      applyBudgetId(initialBudgetId);
    }
  }, [initialBudgetId, budgetFolders, applyBudgetId]);

  const onSubmit = async (data: TransactionFormValues) => {
    if (!session?.user) return;

    if (!isValidAmountInput(data.amount)) return;
    const parsedAmount = parseAmountInput(data.amount);
    const normalizedBudgetFolderId =
      data.budget_folder_id === "unbudgeted" ? null : data.budget_folder_id;
    const nextDueDate = data.nextDueDate
      ? formatDateOnly(data.nextDueDate)
      : recurringRule?.next_due_date ?? formatDateOnly(new Date());

    setIsLoading(true);
    try {
      const transactionData = {
        user_id: session.user.id,
        title: data.title,
        amount: parsedAmount,
        type: data.type,
        budget_folder_id: normalizedBudgetFolderId,
        created_at: toOffsetISOString(data.created_at),
        is_recurring: hasRecurringRule ? false : (data.isRecurring || false),
        recurrence_day: hasRecurringRule
          ? null
          : data.isRecurring
          ? (data.recurrenceDay ?? new Date().getDate())
          : null,
        recurring_rule_id: effectiveRecurringRuleId,
      };

      let error: unknown = null;
      if (initialData?.id) {
        const { error: updateError } = await supabase
          .from("transactions")
          .update(transactionData)
          .eq("id", initialData.id)
          .eq("user_id", session.user.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("transactions")
          .insert(transactionData);
        error = insertError;
      }

      if (error) throw error;

      if (hasRecurringRule) {
        await updateRecurringRule({
          title_pattern: data.title,
          avg_amount: parsedAmount,
          budget_folder_id: normalizedBudgetFolderId,
          cadence: data.recurrenceCadence ?? recurringRule?.cadence ?? "monthly",
          next_due_date: nextDueDate,
          type: data.type,
        });
      }

      // Check budget thresholds for expense transactions
      if (data.type === "expense" && transactionData.budget_folder_id) {
        try {
          await checkBudgetThresholds(
            supabase,
            session.user.id,
            transactionData.budget_folder_id,
            locale
          );
        } catch (budgetCheckError) {
          console.error("Error checking budget thresholds:", budgetCheckError);
          // Don't fail the transaction if budget check fails
        }
      }

      if (data.type === "expense") {
        try {
          await checkMainBudgetThresholds(supabase, session.user.id, locale);
        } catch (mainBudgetCheckError) {
          console.error("Error checking main budget thresholds:", mainBudgetCheckError);
        }
      }

      // Save Template if checked
      if (data.saveAsTemplate && !initialData?.id) {
        const limitReached = templates.length >= 3;
        if (!limitReached) {
          const exists = templates.some(
            (t) => normalizeTitle(t.title) === normalizeTitle(data.title),
          );
          if (!exists) {
            await supabase.from("transaction_templates").insert({
              user_id: session.user.id,
              title: data.title,
              amount: parsedAmount,
              type: data.type,
              budget_folder_id: transactionData.budget_folder_id,
            });
          }
        }
      }

      // Toast is handled by the parent component via onSuccess -> onSubmit
      // toast({
      //   title: initialData ? "Transaction updated" : "Transaction added",
      //   description: `Successfully ${initialData ? "updated" : "added"} transaction.`,
      //   variant: "default",
      // });

      // Notify parent first to show toast, then hard reload to refresh all data
      onSuccess();
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error("Error submitting transaction:", err);
      toast({
        title: "Error",
        description: "Failed to save transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBudgets = budgetFolders.filter((budget) =>
    budget.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const showSearch = budgetFolders.length > 5;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Type Tabs */}
      <Controller
        name="type"
        control={control}
        render={({ field }) => (
          <Tabs
            value={field.value}
            onValueChange={(v) => field.onChange(v as "expense" | "income")}
            className="mb-3 flex justify-center"
          >
            <TabsList className="mx-auto gap-2">
              <TabsTrigger
                value="expense"
                disabled={isTypeDisabled}
                className="data-[state=active]:bg-red-500 data-[state=active]:text-white"
              >
                <span>{tModals("transaction.type.expense")}</span>
              </TabsTrigger>
              <TabsTrigger
                value="income"
                disabled={isTypeDisabled}
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
              >
                <span>{tModals("transaction.type.income")}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      />

      {/* Amount Input */}
      <Controller
        name="amount"
        control={control}
        render={({ field }) => (
          <TextInput
            {...field}
            ref={(e) => {
              field.ref(e);
              amountRef.current = e;
            }}
            type="text"
            inputMode="decimal"
            placeholder={tTransactions("table.headers.amount")}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
                field.onChange(value);
              }
            }}
            className={`border-border/80 text-3xl font-medium focus-visible:border-border focus-visible:ring-1 focus-visible:ring-border focus-visible:ring-offset-0 ${currentType === "expense" ? "text-error" : "text-success"}`}
          />
        )}
      />

      {/* Title Input & Autocomplete */}
      <div className="space-y-2">
        <Controller
          name="title"
          control={control}
          render={({ field }) => (
            <TextInput
              {...field}
              type="text"
              placeholder={tModals("transaction.placeholder.title")}
              onInput={(_e) => {
                // Basic sanitization if needed, but react-hook-form handles value
              }}
            />
          )}
        />

        {currentTitle && (
          <Command className="border rounded-md">
            <CommandList>
              <CommandEmpty>{tModals("transaction.noResults")}</CommandEmpty>
              <CommandGroup>
                {templates
                  .filter((t) =>
                    normalizeTitle(t.title).includes(
                      normalizeTitle(currentTitle),
                    ),
                  )
                  .slice(0, 3)
                  .map((t) => (
                    <CommandItem
                      key={`tpl-${t.id}`}
                      onSelect={() => {
                        setValue("title", t.title);
                        setValue("amount", String(t.amount));
                        applyBudgetId(t.budget_folder_id ?? "unbudgeted");
                        setValue("type", t.type);
                      }}
                    >
                      <span className="font-medium">⭐ {t.title}</span>
                      <span className="ml-auto text-muted-foreground">
                        {String(t.amount)}
                      </span>
                    </CommandItem>
                  ))}
                {recentTitles
                  .filter((tt) =>
                    normalizeTitle(tt).includes(normalizeTitle(currentTitle)),
                  )
                  .slice(0, 3)
                  .map((tt) => (
                    <CommandItem
                      key={`hist-${tt}`}
                      onSelect={() => setValue("title", tt)}
                    >
                      <span className="font-medium">{tt}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </div>

      {/* Date Picker */}
      <Controller
        name="created_at"
        control={control}
        render={({ field }) => (
          <HybridDatePicker
            selectedDate={field.value}
            onDateSelect={(nextDate) =>
              field.onChange(mergeDateWithTime(nextDate, field.value ?? new Date()))
            }
            label={tModals("transaction.date.label")}
            placeholder={tModals("transaction.date.placeholder")}
          />
        )}
      />

      {/* Budget Selection */}
      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium text-secondary-black dark:text-white">
          {tModals("transaction.select.label")}
        </div>
        <Controller
          name="budget_folder_id"
          control={control}
          render={({ field }) => {
            const selectedBudget = budgetFolders.find((b) => b.id === field.value);
            const displayLabel = selectedBudget
              ? `${selectedBudget.emoji ? `${selectedBudget.emoji} ` : ""}${selectedBudget.name}`
              : tModals("transaction.select.unbudgeted");

            return isMobile ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsBudgetSheetOpen(true);
                  }}
                  className="flex h-[50px] w-full items-center justify-between rounded-md border border-input bg-background px-[20px] text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <span className="text-foreground">{displayLabel}</span>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 15 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 opacity-50"
                  >
                    <path
                      d="M4.93179 5.43179C4.75605 5.60753 4.75605 5.89245 4.93179 6.06819C5.10753 6.24392 5.39245 6.24392 5.56819 6.06819L7.49999 4.13638L9.43179 6.06819C9.60753 6.24392 9.89245 6.24392 10.0682 6.06819C10.2439 5.89245 10.2439 5.60753 10.0682 5.43179L7.81819 3.18179C7.73379 3.0974 7.61933 3.04999 7.49999 3.04999C7.38064 3.04999 7.26618 3.0974 7.18179 3.18179L4.93179 5.43179ZM10.0682 9.56819C10.2439 9.39245 10.2439 9.10753 10.0682 8.93179C9.89245 8.75606 9.60753 8.75606 9.43179 8.93179L7.49999 10.8636L5.56819 8.93179C5.39245 8.75606 5.10753 8.75606 4.93179 8.93179C4.75605 9.10753 4.75605 9.39245 4.93179 9.56819L7.18179 11.8182C7.26618 11.9026 7.38064 11.95 7.49999 11.95C7.61933 11.95 7.73379 11.9026 7.81819 11.8182L10.0682 9.56819Z"
                      fill="currentColor"
                      fillRule="evenodd"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                <Sheet open={isBudgetSheetOpen} onOpenChange={setIsBudgetSheetOpen}>
                  <SheetContent side="bottom" className="px-4 pb-4 pt-6">
                    <div className="mx-auto h-1.5 w-12 rounded-full bg-muted mb-6" />
                    <SheetHeader className="justify-center">
                      <SheetTitle className="w-full text-lg text-center">
                        {tModals("transaction.select.label")}
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 flex flex-col gap-2 max-h-[60vh] overflow-y-auto pb-4">
                      <button
                        type="button"
                        onClick={() => {
                          field.onChange(null);
                          applyBudgetId("unbudgeted");
                          setIsBudgetSheetOpen(false);
                        }}
                        className={`flex items-center justify-between p-4 rounded-md border transition-colors ${
                          field.value === null || field.value === "unbudgeted"
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background"
                        }`}
                      >
                        <span className="text-base font-medium">
                          {tModals("transaction.select.unbudgeted")}
                        </span>
                        {(field.value === null || field.value === "unbudgeted") && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 15 15"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 text-white"
                            >
                              <path
                                d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
                                fill="currentColor"
                                fillRule="evenodd"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        )}
                      </button>
                      {filteredBudgets.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            field.onChange(b.id);
                            applyBudgetId(b.id);
                            setIsBudgetSheetOpen(false);
                          }}
                          className={`flex items-center justify-between p-4 rounded-md border transition-colors ${
                            field.value === b.id
                              ? "border-primary bg-primary/10"
                              : "border-border bg-background"
                          }`}
                        >
                          <span className="text-base font-medium">
                            {b.emoji ? `${b.emoji} ${b.name}` : b.name}
                          </span>
                          {field.value === b.id && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 15 15"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 text-white"
                              >
                                <path
                                  d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
                                  fill="currentColor"
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            ) : (
              <Select
                value={field.value || "unbudgeted"}
                onValueChange={(val) => {
                  field.onChange(val);
                  applyBudgetId(val);
                }}
              >
                <SelectTrigger className="bg-background text-foreground h-[50px] px-[20px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unbudgeted">
                    {tModals("transaction.select.unbudgeted")}
                  </SelectItem>
                  {filteredBudgets.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.emoji ? `${b.emoji} ${b.name}` : b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }}
        />
      </div>

      {/* Budget Search (if many) */}
      {showSearch && (
        <input
          type="text"
          placeholder={tModals("transaction.search.placeholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-[50px] px-[20px] w-full rounded-md border border-input bg-background text-sm"
        />
      )}

      {/* Save Template Checkbox */}
      <div className="flex items-center gap-2">
        <Controller
          name="saveAsTemplate"
          control={control}
          render={({ field }) => (
            <Checkbox
              checked={field.value}
              onChange={field.onChange}
              disabled={!isPro && templates.length >= 3}
              className="h-7 w-7 md:h-4 md:w-4 rounded border border-border bg-transparent dark:bg-transparent accent-primary"
            />
          )}
        />
        <div className="text-sm">
          {tModals("transaction.saveAsTemplate")}
          {!isPro && templates.length >= 3 && (
            <span className="ml-2 text-xs text-muted-foreground">
              {tModals("transaction.templateLimitReached")}
            </span>
          )}
        </div>
      </div>

      {/* Recurring Checkbox */}
      <div className="flex flex-col gap-2">
        {hasRecurringRule ? (
          <>
            <div className="text-sm font-medium text-secondary-black dark:text-white">
              {tSettings("recurringRules.title")}
            </div>
            {isRecurringRuleLoading ? (
              <div className="text-sm text-muted-foreground">
                {tCommon("loading")}...
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-medium text-secondary-black dark:text-white">
                    {tSettings("recurringRules.form.cadence.label")}
                  </div>
                  <Controller
                    name="recurrenceCadence"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? recurringRule?.cadence ?? "monthly"}
                        onValueChange={(value) =>
                          field.onChange(value as "weekly" | "monthly")
                        }
                      >
                        <SelectTrigger className="bg-background text-foreground h-[50px] px-[20px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">
                            {tSettings("recurringRules.form.cadence.options.weekly")}
                          </SelectItem>
                          <SelectItem value="monthly">
                            {tSettings("recurringRules.form.cadence.options.monthly")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-medium text-secondary-black dark:text-white">
                    {tSettings("recurringRules.form.nextDue.label")}
                  </div>
                  <Controller
                    name="nextDueDate"
                    control={control}
                    render={({ field }) => (
                      <HybridDatePicker
                        selectedDate={field.value ?? new Date()}
                        onDateSelect={(nextDate) => field.onChange(nextDate)}
                        placeholder={tSettings("recurringRules.form.nextDue.placeholder")}
                        className="w-full"
                      />
                    )}
                  />
                </div>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {tModals("transaction.recurringNotificationHint")}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Controller
                name="isRecurring"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onChange={(checked) => {
                      if (!isPro && recurringCount >= 3 && !initialData?.is_recurring) {
                        toast({
                          title: tModals("transaction.recurringLimitTitle"),
                          description: tModals("transaction.recurringLimitMessage"),
                          variant: "destructive",
                        });
                        return;
                      }
                      field.onChange(checked);
                    }}
                    className="h-7 w-7 md:h-4 md:w-4 rounded border border-border bg-transparent dark:bg-transparent accent-primary"
                  />
                )}
              />
              <div className="text-sm">{tModals("transaction.recurring")}</div>
            </div>

            {isRecurring && (
              <div className="ml-6 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {tModals("transaction.recurringRepeatEvery")}
                </span>
                <Controller
                  name="recurrenceDay"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") {
                          field.onChange(null);
                          return;
                        }

                        const val = Number.parseInt(raw, 10);
                        if (!Number.isFinite(val)) return;
                        if (val < 1 || val > 31) return;
                        field.onChange(val);
                      }}
                      className="w-16 h-9 px-2 text-center rounded-md border border-primary bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  )}
                />
                <span className="text-sm text-muted-foreground">
                  {tModals("transaction.recurringDayOfMonth")}
                </span>
              </div>
            )}

            {isRecurring && (
              <div className="ml-6 text-xs text-muted-foreground">
                {tModals("transaction.recurringNotificationHint")}
              </div>
            )}
          </>
        )}
      </div>

      {/* Submit Button */}
      <div className="sticky bottom-0 mt-4">
        <Button
          type="submit"
          text={tCommon("submit")}
          variant="default"
          disabled={isLoading || isRecurringRuleLoading}
          isLoading={isLoading}
          className="w-full"
        />
      </div>
    </form>
  );
}
