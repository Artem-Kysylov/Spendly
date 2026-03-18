// DashboardClient component
"use client";

import { useEffect, useState } from "react";
import { UserAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "@/i18n/routing";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";

import EmptyState from "@/components/chunks/EmptyState";
import CompactKPICard from "@/components/dashboard/CompactKPICard";
import AiInsightTeaser from "@/components/dashboard/AiInsightTeaser";
import SimplifiedChart from "@/components/dashboard/SimplifiedChart";
import DashboardTransactionsTable from "@/components/dashboard/DashboardTransactionsTable";
import RecurringCalendar from "@/components/recurring/RecurringCalendar";
import { useMainBudget } from "@/hooks/useMainBudget";
import {
  getFinancialMonthToDateRange,
  getPreviousFinancialMonthFullRange,
} from "@/lib/dateUtils";
import Spinner from "@/components/ui-elements/Spinner";
import MainBudgetModal from "@/components/modals/MainBudgetModal";
import ToastMessage from "@/components/ui-elements/ToastMessage";
import Button from "@/components/ui-elements/Button";
import TransactionModal from "@/components/modals/TransactionModal";
import { Plus } from "lucide-react";

import useModal from "@/hooks/useModal";
import useCheckBudget from "@/hooks/useCheckBudget";

import { ToastMessageProps, Transaction } from "@/types/types";
import type { EditTransactionPayload } from "@/types/types";
import { calculatePercentageChange, formatCurrency } from "@/lib/chartUtils";
import type { AssistantTone } from "@/types/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function DashboardClient() {
  const { session } = UserAuth();
  const router = useRouter();
  const locale = useLocale();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budget, setBudget] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currency, setCurrency] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("user-currency") || "USD";
    }
    return "USD";
  });
  const [toastMessage, setToastMessage] = useState<ToastMessageProps | null>(
    null,
  );
  const [refreshCounters, setRefreshCounters] = useState<number>(0);
  const { isModalOpen, openModal, closeModal } = useModal();
  const {
    isModalOpen: isAddOpen,
    openModal: openAddModal,
    closeModal: closeAddModal,
  } = useModal();
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const [isConfirmingIncome, setIsConfirmingIncome] = useState(false);
  const [isSnoozingIncome, setIsSnoozingIncome] = useState(false);

  const tDashboard = useTranslations("dashboard");
  const tTransactions = useTranslations("transactions");
  const tCommon = useTranslations("common");
  const tGreeting = useTranslations("greeting");

  const recurringTransactions = transactions.filter((t) => t.is_recurring);
  const recurringTotal = recurringTransactions.reduce((sum, tx) => {
    const n = Number(tx.amount);
    if (!Number.isFinite(n)) return sum;
    return sum + Math.abs(n);
  }, 0);

  const [greetingKey, setGreetingKey] = useState<string>("morning");

  const { isLoading: isBudgetChecking } = useCheckBudget(session?.user?.id);

  const prettifyName = (raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) return "User";
    const parts = cleaned.split(/[._-]+/g).filter(Boolean);
    if (parts.length <= 1) return cleaned;
    return parts
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
  };

  const guessCurrencyFromLocale = (l: string) => {
    const base = l.split("-")[0];
    const map: Record<string, string> = {
      uk: "UAH",
      ru: "RUB",
      ja: "JPY",
      ko: "KRW",
      id: "IDR",
      hi: "INR",
    };
    return map[base] || "USD";
  };

  const fetchTransactions = async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    // Resolve currency deterministically
    try {
      const metaCurrency =
        (session.user.user_metadata as any)?.currency_preference as string | undefined;
      const localCurrency =
        typeof window !== "undefined" ? localStorage.getItem("user-currency") : null;
      let resolved = metaCurrency || localCurrency || guessCurrencyFromLocale(locale) || "USD";

      // Try to read currency from public.user_settings as the most authoritative
      try {
        const { data: userSettings } = await supabase
          .from("user_settings")
          .select("currency")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (userSettings?.currency) {
          resolved = userSettings.currency;
        }
      } catch {}

      setCurrency(resolved);
      if (typeof window !== "undefined") {
        localStorage.setItem("user-currency", resolved);
      }
      if (metaCurrency !== resolved) {
        try {
          await supabase.auth.updateUser({
            data: { currency_preference: resolved },
          });
        } catch {}
      }
    } catch {}

    const { data, error } = await supabase
      .from("transactions")
      .select(`
        *,
        budget_folders (
          emoji,
          name
        )
      `)
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    const { data: budgetData } = await supabase
      .from("main_budget")
      .select("amount")
      .eq("user_id", session.user.id)
      .single();

    if (budgetData) {
      setBudget(budgetData.amount);
    }

    if (error) {
      console.error("Error fetching transactions:", error);
    }

    const transformedData = (data ?? []).map((transaction) => ({
      ...transaction,
      category_emoji: transaction.budget_folders?.emoji || null,
      category_name: transaction.budget_folders?.name || null,
    }));

    setTransactions(transformedData as Transaction[]);
    setTimeout(() => setIsLoading(false), 500);
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchTransactions();
    }

    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreetingKey("morning");
    else if (hour >= 12 && hour < 18) setGreetingKey("afternoon");
    else setGreetingKey("evening");
  }, [session?.user?.id]);

  const handleToastMessage = (
    text: string,
    type: ToastMessageProps["type"],
  ) => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleTransactionSubmit = (
    message: string,
    type: ToastMessageProps["type"],
  ) => {
    handleToastMessage(message, type);
    if (type === "success") {
      setRefreshCounters((prev) => prev + 1);
      setTimeout(() => {
        fetchTransactions();
      }, 1000);
    }
  };

  const handleIconClick = () => {
    openModal();
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting transaction:", error);
        handleToastMessage(tTransactions("toast.deleteFailed"), "error");
        return;
      }
      handleToastMessage(tTransactions("toast.deleteSuccess"), "success");
      setTimeout(() => {
        fetchTransactions();
        setRefreshCounters((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Unexpected error during deletion:", error);
      handleToastMessage(tCommon("unexpectedError"), "error");
    }
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
  };

  // Calculations for KPI Cards
  const { budgetResetDay, needsIncomeConfirmation } = useMainBudget();

  const handleConfirmIncome = async () => {
    if (!session?.user?.id) return;
    if (isConfirmingIncome) return;
    try {
      setIsConfirmingIncome(true);

      const userId = session.user.id;
      const salaryTitle = tDashboard("incomeConfirmation.salaryTitle");
      const nowIso = new Date().toISOString();

      const { error: txError } = await supabase.from("transactions").insert({
        user_id: userId,
        title: salaryTitle,
        amount: budget,
        type: "income",
        budget_folder_id: null,
        created_at: nowIso,
        is_recurring: false,
      });

      if (txError) {
        console.error("Error creating salary transaction:", txError);
        handleToastMessage(tCommon("unexpectedError"), "error");
        return;
      }

      const { error: stateError } = await supabase
        .from("main_budget_state")
        .update({ income_confirmed: true, snooze_until: null })
        .eq("user_id", userId);

      if (stateError) {
        console.error("Error confirming income:", stateError);
        handleToastMessage(tCommon("unexpectedError"), "error");
        return;
      }

      const meta = session.user.user_metadata;
      const toneRaw =
        meta && typeof meta === "object"
          ? (meta as { assistant_tone?: unknown }).assistant_tone
          : undefined;
      const tone: AssistantTone | undefined =
        typeof toneRaw === "string" ? (toneRaw as AssistantTone) : undefined;

      const isPlayful = tone === "friendly" || tone === "playful";
      const toastText = isPlayful
        ? tDashboard("incomeConfirmation.toastSuccessPlayful")
        : tDashboard("incomeConfirmation.toastSuccessNeutral");

      handleToastMessage(toastText, "success");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("main_budget:updated"));
      }

      setRefreshCounters((prev) => prev + 1);
      setTimeout(() => {
        fetchTransactions();
      }, 600);
    } catch (e) {
      console.error("Unexpected error confirming income:", e);
      handleToastMessage(tCommon("unexpectedError"), "error");
    } finally {
      setIsConfirmingIncome(false);
    }
  };

  const handleSnoozeIncome = async () => {
    if (!session?.user?.id) return;
    if (isSnoozingIncome) return;
    try {
      setIsSnoozingIncome(true);

      const userId = session.user.id;
      const snoozeUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error: stateError } = await supabase
        .from("main_budget_state")
        .update({ snooze_until: snoozeUntil })
        .eq("user_id", userId);

      if (stateError) {
        console.error("Error snoozing income confirmation:", stateError);
        handleToastMessage(tCommon("unexpectedError"), "error");
        return;
      }

      handleToastMessage(tDashboard("incomeConfirmation.toastSnoozed"), "success");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("main_budget:updated"));
      }
    } catch (e) {
      console.error("Unexpected error snoozing income confirmation:", e);
      handleToastMessage(tCommon("unexpectedError"), "error");
    } finally {
      setIsSnoozingIncome(false);
    }
  };

  const currentCycleData = transactions.filter((transaction) => {
    const { start, end } = getFinancialMonthToDateRange(budgetResetDay || 1);
    const transactionDate = new Date(transaction.created_at);
    return transactionDate >= start && transactionDate <= end;
  });

  const previousCycleData = transactions.filter((transaction) => {
    const { start, end } = getPreviousFinancialMonthFullRange(budgetResetDay || 1);
    const transactionDate = new Date(transaction.created_at);
    return transactionDate >= start && transactionDate <= end;
  });

  const totalExpenses = currentCycleData
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  const previousCycleExpenses = previousCycleData
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  const expensesTrend = calculatePercentageChange(
    previousCycleExpenses,
    totalExpenses,
  );

  return (
    <div>
      {isLoading || isBudgetChecking ? (
        <Spinner />
      ) : (
        <>
          {toastMessage && (
            <ToastMessage text={toastMessage.text} type={toastMessage.type} />
          )}
          <motion.div
            className="w-full max-w-[500px] md:max-w-none mx-auto flex flex-col items-center gap-5 text-center mt-[30px] px-4 sm:px-4 md:px-5 md:flex-row md:justify-between md:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <motion.h1
              className="text-[26px] sm:text-[32px] md:text-[35px] font-semibold text-secondary-black"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            >
              {tGreeting(greetingKey)},{" "}
              {session?.user?.user_metadata?.full_name ||
                session?.user?.user_metadata?.name ||
                prettifyName(session?.user?.email?.split("@")[0] || "") ||
                "User"} 👋
            </motion.h1>
          </motion.div>

          <motion.div
            style={{ willChange: "opacity" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.28 }}
            className="mt-[30px] px-4 sm:px-4 md:px-5 w-full max-w-[500px] md:max-w-none mx-auto flex flex-col gap-5 overflow-x-hidden min-w-0"
          >
            <CompactKPICard
              budget={budget}
              totalExpenses={totalExpenses}
              expensesTrend={expensesTrend}
              onBudgetClick={handleIconClick}
              currency={currency}
            />

            {needsIncomeConfirmation && budget > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-[32px] border border-border bg-card p-4 flex flex-col gap-3"
              >
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-semibold text-foreground">
                    {tDashboard("incomeConfirmation.cardTitle")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {tDashboard("incomeConfirmation.cardMessage", {
                      amount: formatCurrency(budget, currency),
                    })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    text={tDashboard("incomeConfirmation.confirm")}
                    variant="default"
                    className="flex-1"
                    onClick={handleConfirmIncome}
                    disabled={isConfirmingIncome || isSnoozingIncome}
                    isLoading={isConfirmingIncome}
                  />
                  <Button
                    text={tDashboard("incomeConfirmation.notYet")}
                    variant="ghost"
                    className="flex-1"
                    onClick={handleSnoozeIncome}
                    disabled={isConfirmingIncome || isSnoozingIncome}
                    isLoading={isSnoozingIncome}
                  />
                </div>
              </motion.div>
            )}

            <AiInsightTeaser
              budget={budget}
              totalExpenses={totalExpenses}
              transactions={transactions}
            />

            <motion.div
              style={{ willChange: "opacity" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.28 }}
              className="mt-8 min-w-0 overflow-x-hidden"
            >
              {recurringTransactions.length > 0 ? (
                <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
                  <SimplifiedChart />

                  <Card className="w-full overflow-hidden lg:min-h-[340px] flex flex-col">
                    <CardHeader className="px-4 pt-5 pb-3 sm:px-5">
                      <CardTitle>
                        {tTransactions("recurring.calendar.title")}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {tTransactions("recurring.calendar.total")} •{" "}
                        {formatCurrency(recurringTotal, currency)} • ({
                          recurringTransactions.length
                        })
                      </p>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 sm:px-5 lg:px-6 lg:pb-6 lg:flex-1 lg:flex lg:items-stretch">
                      <RecurringCalendar
                        transactions={recurringTransactions}
                        variant="dashboard"
                        currency={currency}
                      />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <SimplifiedChart />
              )}
            </motion.div>

            {isLoading ? (
              <Spinner />
            ) : transactions.length === 0 ? (
              <EmptyState
                title={tTransactions("empty.title")}
                description={tTransactions("empty.description")}
                buttonText={tTransactions("addTransaction")}
                onButtonClick={openAddModal}
              />
            ) : (
              <motion.div
                style={{ willChange: "opacity" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.28 }}
                className="mt-8 min-w-0 overflow-x-hidden"
              >
                <DashboardTransactionsTable
                  transactions={transactions}
                  onEdit={(tx) => openEditModal(tx)}
                  onDelete={handleDeleteTransaction}
                  currency={currency}
                />
              </motion.div>
            )}
          </motion.div>

          {isModalOpen && (
            <MainBudgetModal
              title={tDashboard("mainBudget.editTitle")}
              onSubmit={handleTransactionSubmit}
              onClose={closeModal}
            />
          )}
          {isAddOpen && (
            <TransactionModal
              title={tTransactions("modal.addTitle")}
              onClose={closeAddModal}
              onSubmit={(message, type) => {
                handleTransactionSubmit(message, type);
              }}
            />
          )}
          {editingTransaction && (
            <TransactionModal
              title={tTransactions("table.modal.editTitle")}
              initialData={editingTransaction}
              onClose={() => setEditingTransaction(null)}
              onSubmit={(message, type) => {
                handleTransactionSubmit(message, type);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

export default DashboardClient;
