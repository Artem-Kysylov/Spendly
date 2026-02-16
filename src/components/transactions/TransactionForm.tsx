"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/ui-elements/Button";
import HybridDatePicker from "@/components/ui-elements/HybridDatePicker";
import TextInput from "@/components/ui-elements/TextInput";
import { UserAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { isValidAmountInput, parseAmountInput } from "@/lib/utils";
import type { BudgetFolderItemProps, Transaction } from "@/types/types";

// Schema definition
const transactionSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  title: z.string().min(1, "Title is required"),
  type: z.enum(["expense", "income"]),
  budget_folder_id: z.string().nullable(),
  created_at: z.date(),
  saveAsTemplate: z.boolean().optional(),
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
  const tModals = useTranslations("modals");
  const tCommon = useTranslations("common");
  const tTransactions = useTranslations("transactions");
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

  const amountRef = useRef<HTMLInputElement | null>(null);

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
    },
  });

  const { control, handleSubmit, watch, setValue } = form;
  const currentType = watch("type");
  const currentTitle = watch("title");

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

    setIsLoading(true);
    try {
      const transactionData = {
        user_id: session.user.id,
        title: data.title,
        amount: parsedAmount,
        type: data.type,
        budget_folder_id:
          data.budget_folder_id === "unbudgeted" ? null : data.budget_folder_id,
        created_at: data.created_at.toISOString(),
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

      // Notify parent first to show toast, then refresh data
      onSuccess();
      setTimeout(() => router.refresh(), 100);
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
                className="data-[state=active]:bg-error data-[state=active]:text-error-foreground"
              >
                {tModals("transaction.type.expense")}
              </TabsTrigger>
              <TabsTrigger
                value="income"
                disabled={isTypeDisabled}
                className="data-[state=active]:bg-success data-[state=active]:text-success-foreground"
              >
                {tModals("transaction.type.income")}
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
            className={`text-3xl font-medium ${currentType === "expense" ? "text-error" : "text-success"}`}
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
            onDateSelect={field.onChange}
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
          render={({ field }) => (
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
          )}
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
              className="h-4 w-4 rounded border border-border bg-transparent dark:bg-transparent accent-primary"
            />
          )}
        />
        <div className="text-sm">{tModals("transaction.saveAsTemplate")}</div>
      </div>

      {/* Submit Button */}
      <div className="sticky bottom-0 mt-4">
        <Button
          type="submit"
          text={tCommon("submit")}
          variant="default"
          disabled={isLoading}
          isLoading={isLoading}
          className={`w-full ${currentType === "expense" ? "bg-error text-error-foreground" : "bg-success text-success-foreground"}`}
        />
      </div>
    </form>
  );
}
