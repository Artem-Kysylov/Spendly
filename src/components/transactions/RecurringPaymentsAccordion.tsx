"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { UserAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import type { Transaction } from "@/types/types";
import RecurringCalendar from "@/components/recurring/RecurringCalendar";

interface RecurringPaymentsAccordionProps {
  onEdit: (transaction: Transaction) => void;
  onRefresh?: () => void;
}

export default function RecurringPaymentsAccordion({
  onEdit,
  onRefresh,
}: RecurringPaymentsAccordionProps) {
  const { session } = UserAuth();
  const t = useTranslations("transactions");
  const tCommon = useTranslations("common");

  const [recurringTransactions, setRecurringTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currency, setCurrency] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("user-currency") || "USD";
    }
    return "USD";
  });

  const fetchRecurringTransactions = async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("is_recurring", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecurringTransactions((data as Transaction[]) || []);
    } catch (error) {
      console.error("Error fetching recurring transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecurringTransactions();
  }, [session?.user?.id]);

  const handleDelete = async (id: string) => {
    if (!session?.user?.id) return;
    if (!confirm(tCommon("delete") + "?")) return;

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", session.user.id);

      if (error) throw error;

      setRecurringTransactions((prev) => prev.filter((t) => t.id !== id));
      onRefresh?.();
    } catch (error) {
      console.error("Error deleting recurring transaction:", error);
    }
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="recurring" className="border rounded-xl">
        <AccordionTrigger className="px-4 py-3 hover:no-underline">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔁</span>
            <span className="font-medium">{t("recurring.title")}</span>
            {recurringTransactions.length > 0 && (
              <span className="text-xs text-muted-foreground ml-2">
                ({recurringTransactions.length})
              </span>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              {tCommon("loading")}...
            </div>
          ) : recurringTransactions.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              {t("recurring.empty")}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-start">
                <div className="min-w-0">
                  <RecurringCalendar
                    transactions={recurringTransactions}
                    variant="settings"
                    currency={currency}
                  />
                </div>
                <div className="min-w-0 border-t border-border pt-4 lg:border-t-0 lg:border-l lg:pl-4 lg:pt-0">
                  <div className="space-y-2 lg:max-h-[420px] lg:overflow-y-auto lg:pr-1">
                    {recurringTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{transaction.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {transaction.amount} • {transaction.type}
                            {transaction.recurrence_day && (
                              <> • {t("recurring.dayLabel", { day: transaction.recurrence_day })}</>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <button
                            type="button"
                            onClick={() => onEdit(transaction)}
                            className="p-2 rounded-md hover:bg-primary/10 text-primary transition-colors"
                            aria-label="Edit recurring transaction"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(transaction.id)}
                            className="p-2 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                            aria-label="Delete recurring transaction"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
