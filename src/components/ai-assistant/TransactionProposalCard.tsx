"use client";

import { Edit2, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { saveProposedTransaction } from "@/app/[locale]/actions/transaction";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAuth } from "@/context/AuthContext";
import { formatMoney } from "@/lib/format/money";
import { isValidAmountInput, parseAmountInput } from "@/lib/utils";
import { HybridDatePicker } from "../ui-elements";

interface Budget {
  id: string;
  name: string;
  emoji?: string;
  type: "expense" | "income";
}

interface ProposedTransaction {
  title: string;
  amount: number;
  type: "expense" | "income";
  category_name: string;
  date: string;
}

interface TransactionProposalCardProps {
  proposal: ProposedTransaction;
  budgets: Budget[];
  onSuccess?: () => void;
  onError?: (error: string) => void;
  autoDismissSuccess?: boolean;
  currency?: string;
  locale?: string;
}

export function TransactionProposalCard({
  proposal,
  budgets,
  onSuccess,
  onError,
  autoDismissSuccess = true,
  currency,
  locale,
}: TransactionProposalCardProps) {
  const { session } = UserAuth();
  const userId = session?.user?.id;
  const tModals = useTranslations("modals");
  const tAssistant = useTranslations("assistant");

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Form state
  const [title, setTitle] = useState(proposal.title);
  const [amount, setAmount] = useState(proposal.amount.toString());
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>("");

  // Парсим строку даты из предложения и нормализуем в Date
  const parseInitialDate = (s: string): Date => {
    const d1 = new Date(s);
    if (!Number.isNaN(d1.getTime())) return d1;
    // Поддержка формата DD.MM.YYYY
    const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (m) {
      const dd = Number(m[1]),
        mm = Number(m[2]) - 1,
        yyyy = Number(m[3]);
      const d = new Date(yyyy, mm, dd);
      if (!Number.isNaN(d.getTime())) return d;
    }
    // Поддержка YYYY-MM-DD
    const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m2) {
      const yyyy = Number(m2[1]),
        mm = Number(m2[2]) - 1,
        dd = Number(m2[3]);
      const d = new Date(yyyy, mm, dd);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    parseInitialDate(proposal.date),
  );

  // Smart mapping: Find budget by category_name (case-insensitive)
  const mappedBudget = useMemo(() => {
    const categoryLower = proposal.category_name.toLowerCase();
    return budgets.find(
      (b) =>
        b.name.toLowerCase() === categoryLower ||
        b.name.toLowerCase().includes(categoryLower),
    );
  }, [proposal.category_name, budgets]);

  useEffect(() => {
    if (mappedBudget) {
      setSelectedBudgetId(mappedBudget.id);
    } else {
      // Default to unbudgeted if no match found
      setSelectedBudgetId("unbudgeted");
    }
  }, [mappedBudget, budgets]);

  const selectedBudget = budgets.find((b) => b.id === selectedBudgetId);

  const handleConfirm = async () => {
    if (!userId) {
      onError?.("Missing user information");
      return;
    }

    if (!isValidAmountInput(amount)) {
      onError?.("Failed to save transaction");
      return;
    }

    setIsSaving(true);

    try {
      const result = await saveProposedTransaction({
        user_id: userId,
        title,
        amount: parseAmountInput(amount),
        type: proposal.type,
        budget_folder_id: selectedBudgetId === "unbudgeted" ? null : selectedBudgetId,
        created_at: selectedDate.toISOString(), // сохраняем ISO
      });

      if (result.success) {
        setIsSuccess(true);

        onSuccess?.();

        // Auto-dismiss after 3 seconds
        if (autoDismissSuccess) {
          setTimeout(() => {
            setIsSuccess(false);
          }, 3000);
        }
      } else {
        onError?.(result.error || "Failed to save transaction");
      }
    } catch (_error) {
      onError?.("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    const resolvedLocale =
      locale ||
      (typeof navigator !== "undefined" ? navigator.language : "en-US");
    return formatMoney(value, currency || "USD", resolvedLocale);
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isDismissed) return null;

  // Success state
  if (isSuccess) {
    return (
      <div className="rounded-2xl px-4 py-3 shadow-sm w-full bg-muted/50">
        <div className="text-sm leading-relaxed whitespace-pre-line">{tAssistant("transactionSaved.message")}</div>
      </div>
    );
  }

  return (
    <Card className="w-full md:max-w-xl rounded-xl border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Proposed Transaction</span>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {isEditing ? (
          // Edit Mode
          <>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Transaction title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
                    setAmount(value);
                  }
                }}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget</Label>
              <Select
                value={selectedBudgetId}
                onValueChange={setSelectedBudgetId}
              >
                <SelectTrigger id="budget">
                  <SelectValue placeholder="Select budget" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unbudgeted">
                    <span className="flex items-center gap-2">
                      <span>📋</span>
                      <span>{tModals("transaction.select.unbudgeted")}</span>
                    </span>
                  </SelectItem>
                  {budgets.map((budget) => (
                    <SelectItem key={budget.id} value={budget.id}>
                      <span className="flex items-center gap-2">
                        <span>{budget.emoji || "📁"}</span>
                        <span>{budget.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <HybridDatePicker
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                label="Date"
                placeholder="Choose date"
              />
            </div>
          </>
        ) : (
          // View Mode
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span
                className={`text-lg font-semibold ${
                  proposal.type === "expense"
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                {proposal.type === "expense" ? "-" : "+"}
                {formatCurrency(parseFloat(amount))}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Title</span>
              <span className="font-medium">{title}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Budget</span>
              <span className="flex items-center gap-1">
                <span>{selectedBudgetId === "unbudgeted" ? "📋" : selectedBudget?.emoji || "📁"}</span>
                <span className="font-medium">
                  {selectedBudgetId === "unbudgeted" ? tModals("transaction.select.unbudgeted") : selectedBudget?.name || "Unknown"}
                </span>
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Date</span>
              <span className="font-medium">{formatDate(selectedDate)}</span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {isEditing ? (
          <>
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              onClick={() => setIsDismissed(true)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
