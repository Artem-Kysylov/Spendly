"use client";

import { Loader2, Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { saveProposedTransaction } from "@/app/[locale]/actions/transaction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAuth } from "@/context/AuthContext";
import { toOffsetISOString, mergeDateWithCurrentTime } from "@/lib/dateUtils";
import { formatCurrency } from "@/lib/chartUtils";
import { findMatchingBudget, parseAmountInput } from "@/lib/utils";

interface Budget {
  id: string;
  name: string;
  emoji?: string;
  type: "expense" | "income";
}

export interface ProposedTransaction {
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
  onDismiss?: () => void;
  autoDismissSuccess?: boolean;
  currency?: string;
}

export function TransactionProposalCard({
  proposal,
  budgets,
  onSuccess,
  onError,
  onDismiss,
  autoDismissSuccess = true,
  currency,
}: TransactionProposalCardProps) {
  const { session } = UserAuth();
  const userId = session?.user?.id;
  const tModals = useTranslations("modals");
  const tAssistant = useTranslations("assistant");
  const locale = useLocale();

  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(proposal.title);
  const [amount, setAmount] = useState(String(proposal.amount ?? ""));

  // Parse date from proposal and merge with current time
  // This ensures transactions have proper timestamps for chronological sorting
  const selectedDate = mergeDateWithCurrentTime(proposal.date);

  // Smart mapping: Find budget by category_name (case-insensitive)
  const mappedBudget = useMemo(() => {
    return findMatchingBudget(budgets, proposal.category_name);
  }, [proposal.category_name, budgets]);

  const selectedBudgetId = mappedBudget?.id || "unbudgeted";
  const [editableBudgetId, setEditableBudgetId] = useState(selectedBudgetId);

  const selectedBudget = budgets.find((b) => b.id === editableBudgetId);

  useEffect(() => {
    if (
      selectedBudgetId !== "unbudgeted" &&
      (editableBudgetId === "unbudgeted" || !budgets.some((budget) => budget.id === editableBudgetId))
    ) {
      setEditableBudgetId(selectedBudgetId);
    }
  }, [budgets, editableBudgetId, selectedBudgetId]);

  const handleConfirm = async () => {
    if (!userId) {
      onError?.("Missing user information");
      return;
    }

    const safeTitle = String(title || "").trim();
    const parsedAmount = parseAmountInput(amount);

    if (!safeTitle) {
      onError?.("Invalid title");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      onError?.("Invalid amount");
      return;
    }

    setIsSaving(true);

    try {
      const result = await saveProposedTransaction({
        user_id: userId,
        title: safeTitle,
        amount: parsedAmount,
        type: proposal.type,
        budget_folder_id: editableBudgetId === "unbudgeted" ? null : editableBudgetId,
        created_at: toOffsetISOString(selectedDate),
      });

      if (result.success) {
        setIsSuccess(true);
        onSuccess?.();

        if (autoDismissSuccess) {
          setTimeout(() => {
            setIsDismissed(true);
          }, 2000);
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

  const handleCancel = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const amountClass = proposal.type === "expense" ? "text-error" : "text-success";
  const dateObj = new Date(selectedDate);
  const timeLabel = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj);
  const dateLabel = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(dateObj);
  const displayDate = `${dateLabel}, ${timeLabel}`;
  const displayTitle = String(title || "").trim() || proposal.title;
  const displayAmount = Number.isFinite(parseAmountInput(amount))
    ? parseAmountInput(amount)
    : proposal.amount;
  const displayEmoji = selectedBudget?.emoji || mappedBudget?.emoji || "🧾";

  if (isDismissed) return null;

  // Success state
  if (isSuccess) {
    return (
      <div className="rounded-xl px-4 py-3 shadow-sm w-full bg-muted/50 mb-2">
        <div className="text-sm leading-relaxed">{tAssistant("transactionSaved.message")}</div>
      </div>
    );
  }

  // Compact MobileTransactionCard style
  return (
    <div className="relative bg-card rounded-xl border border-border p-4 shadow-sm min-w-0 overflow-x-hidden mb-2">
      {!isEditing && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsEditing(true)}
          className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}

      <div className="flex justify-between items-start gap-3 pt-2 pr-8">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-lg shrink-0 self-start mt-0.5">
            <span>{displayEmoji}</span>
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={tModals("transaction.placeholder.title")}
                  className="h-9"
                />
                <Input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
                      setAmount(value);
                    }
                  }}
                  placeholder={tModals("transaction.placeholder.amountUSD")}
                  className="h-9"
                />
                <Select value={editableBudgetId} onValueChange={setEditableBudgetId}>
                  <SelectTrigger className="h-9 bg-background text-foreground">
                    <SelectValue placeholder={tModals("transaction.select.label")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unbudgeted">
                      {tModals("transaction.select.unbudgeted")}
                    </SelectItem>
                    {budgets.map((budget) => (
                      <SelectItem key={budget.id} value={budget.id}>
                        {budget.emoji ? `${budget.emoji} ` : ""}
                        {budget.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="space-y-0.5 text-xs text-muted-foreground">
                  <div>{displayDate}</div>
                  {(selectedBudget?.name || proposal.category_name) && (
                    <div>{selectedBudget?.name || proposal.category_name}</div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="font-medium truncate">{displayTitle}</div>
                <div className="space-y-0.5 text-xs text-muted-foreground">
                  <div>{displayDate}</div>
                  {(selectedBudget?.name || proposal.category_name) && (
                    <div>{selectedBudget?.name || proposal.category_name}</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0 min-w-fit pt-5">
          <div className={`font-bold ${amountClass} shrink-0`}>
            {formatCurrency(displayAmount, currency)}
          </div>
        </div>
      </div>
      
      <div className="flex gap-2 mt-2.5">
        <Button
          variant="ghost"
          onClick={handleCancel}
          disabled={isSaving}
          className="flex-1 h-8 px-2 py-1 text-muted-foreground hover:text-foreground"
        >
          {tModals("transaction.cancel") || "Cancel"}
        </Button>
        <Button
          variant="ghost"
          onClick={handleConfirm}
          disabled={isSaving}
          className="flex-1 h-8 px-2 py-1 text-primary hover:text-primary"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {tModals("transaction.confirming") || "Confirming..."}
            </>
          ) : (
            tModals("transaction.confirm") || "Confirm"
          )}
        </Button>
      </div>
    </div>
  );
}
