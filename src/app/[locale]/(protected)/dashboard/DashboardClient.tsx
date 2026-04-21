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
  formatDateOnly,
  getFinancialMonthStart,
  getFinancialMonthToDateRange,
  getPreviousFinancialMonthFullRange,
} from "@/lib/dateUtils";
import Spinner from "@/components/ui-elements/Spinner";
import MainBudgetModal from "@/components/modals/MainBudgetModal";
import BudgetRenewalModal from "@/components/modals/BudgetRenewalModal";
import ManualBudgetRenewalModal from "@/components/modals/ManualBudgetRenewalModal";
import ToastMessage from "@/components/ui-elements/ToastMessage";
import Button from "@/components/ui-elements/Button";
import TransactionModal from "@/components/modals/TransactionModal";
import { Plus } from "lucide-react";

import useModal from "@/hooks/useModal";
import useCheckBudget from "@/hooks/useCheckBudget";
import { resetCyclicBudgetFolders } from "@/lib/budget/resetCyclicBudgetFolders";

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
  const [isManualRenewalOpen, setIsManualRenewalOpen] = useState(false);

  const [isConfirmingIncome, setIsConfirmingIncome] = useState(false);
  const [isSnoozingIncome, setIsSnoozingIncome] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

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
      recurring_rule_id: transaction.recurring_rule_id ?? null,
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

  const displayName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    prettifyName(session?.user?.email?.split("@")[0] || "") ||
    "User";

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

  const handleManualRenewalOpen = () => {
    setIsManualRenewalOpen(true);
  };

  const handleManualRenewalClose = () => {
    if (isRenewing) return;
    setIsManualRenewalOpen(false);
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
  const { 
    budgetResetDay, 
    needsIncomeConfirmation, 
    showRenewalModal, 
    showRenewalButton, 
    carryover 
  } = useMainBudget();

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

      // Salary arrived → reset all cyclic ("auto-reset") budget folders.
      // Safe no-op when the user has no cyclic folders.
      try {
        await resetCyclicBudgetFolders(supabase, userId);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("budgets:updated"));
        }
      } catch (resetErr) {
        console.error("Error resetting cyclic budgets on income:", resetErr);
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

  const handleRenewBudget = async () => {
    if (!session?.user?.id) return;
    if (isRenewing) return;
    try {
      setIsRenewing(true);

      const userId = session.user.id;

      // CRITICAL: Fetch current state BEFORE updating last_renewal_date
      const { data: currentState } = await supabase
        .from("main_budget_state")
        .select("last_renewal_date, cycle_start_date")
        .eq("user_id", userId)
        .maybeSingle();

      const currentLastRenewalDate = currentState?.last_renewal_date;
      const currentCycleDate = currentState?.cycle_start_date;

      // STEP 1: Fetch all cyclic budgets
      const { data: cyclicBudgets } = await supabase
        .from("budget_folders")
        .select("id, name, emoji, amount, is_cyclic")
        .eq("user_id", userId)
        .eq("type", "expense")
        .eq("is_cyclic", true);

      // STEP 2: Calculate savings for each cyclic budget using CURRENT last_renewal_date
      const insights = [];
      const cyclicUpdates = [];
      
      if (cyclicBudgets && cyclicBudgets.length > 0 && currentLastRenewalDate) {
        for (const budget of cyclicBudgets) {
          const { data: transactions } = await supabase
            .from("transactions")
            .select("amount")
            .eq("user_id", userId)
            .eq("budget_folder_id", budget.id)
            .eq("type", "expense")
            .gte("created_at", currentLastRenewalDate);

          const spent = (transactions || []).reduce(
            (sum, t) => sum + Number(t.amount || 0),
            0
          );
          const leftover = budget.amount - spent;

          // Store leftover as rollover for cyclic budgets
          if (leftover > 0) {
            insights.push({
              user_id: userId,
              budget_folder_id: budget.id,
              insight_type: "savings_success",
              cycle_date: currentCycleDate || new Date().toISOString().split("T")[0],
              amount_saved: leftover,
              dismissed: false,
            });
            
            cyclicUpdates.push({
              id: budget.id,
              rollover_carry: leftover,
            });
          } else {
            // No leftover, set rollover to 0
            cyclicUpdates.push({
              id: budget.id,
              rollover_carry: 0,
            });
          }
        }
      }

      // STEP 3: Insert insights and update cyclic budget rollovers
      if (insights.length > 0) {
        const { error: insightError } = await supabase
          .from("budget_insights")
          .insert(insights);

        if (insightError) {
          console.error("Error creating insights:", insightError);
        }
      }
      
      // Update rollover_carry for cyclic budgets
      for (const update of cyclicUpdates) {
        await supabase
          .from("budget_folders")
          .update({ rollover_carry: update.rollover_carry })
          .eq("id", update.id)
          .eq("user_id", userId);
      }

      // STEP 4: NOW update last_renewal_date
      const { error: stateError } = await supabase
        .from("main_budget_state")
        .update({ 
          last_renewal_date: new Date().toISOString(),
          snooze_until: null 
        })
        .eq("user_id", userId);

      if (stateError) {
        console.error("Error renewing budget:", stateError);
        handleToastMessage(tCommon("unexpectedError"), "error");
        return;
      }

      handleToastMessage(tDashboard("budgetRenewal.toastSuccess"), "success");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("main_budget:updated"));
        window.dispatchEvent(new CustomEvent("budgets:updated"));
      }

      setRefreshCounters((prev) => prev + 1);
    } catch (e) {
      console.error("Unexpected error renewing budget:", e);
      handleToastMessage(tCommon("unexpectedError"), "error");
    } finally {
      setIsRenewing(false);
    }
  };

  const handleDismissRenewal = async () => {
    if (!session?.user?.id) return;
    if (isDismissing) return;
    try {
      setIsDismissing(true);

      const userId = session.user.id;
      const { data: profileData } = await supabase
        .from("profiles")
        .select("budget_reset_day")
        .eq("id", userId)
        .maybeSingle();

      const resetDayRaw = profileData?.budget_reset_day;
      const resetDay =
        typeof resetDayRaw === "number" && Number.isFinite(resetDayRaw)
          ? Math.min(31, Math.max(1, Math.floor(resetDayRaw)))
          : 1;

      const now = new Date();
      const currentCycleStart = getFinancialMonthStart(resetDay, now);
      const nextCycleProbe = new Date(currentCycleStart);
      nextCycleProbe.setMonth(nextCycleProbe.getMonth() + 1);
      const nextCycleStart = getFinancialMonthStart(resetDay, nextCycleProbe);
      const snoozeUntil = `${formatDateOnly(nextCycleStart)}T00:00:00.000`;

      const { error: stateError } = await supabase
        .from("main_budget_state")
        .update({ snooze_until: snoozeUntil })
        .eq("user_id", userId);

      if (stateError) {
        console.error("Error dismissing renewal modal:", stateError);
        handleToastMessage(tCommon("unexpectedError"), "error");
        return;
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("main_budget:updated"));
      }
    } catch (e) {
      console.error("Unexpected error dismissing renewal modal:", e);
      handleToastMessage(tCommon("unexpectedError"), "error");
    } finally {
      setIsDismissing(false);
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
            className="mx-auto flex w-full max-w-[500px] flex-col items-center px-4 pt-6 pb-4 text-center md:max-w-none md:px-6 md:items-start md:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <motion.h1
              className="flex max-w-full min-w-0 items-center justify-center gap-2 text-2xl font-bold text-foreground md:justify-start md:text-3xl"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            >
              <span className="min-w-0 truncate">{tGreeting(greetingKey)}, {displayName}</span>
              <span className="shrink-0" aria-hidden>
                👋
              </span>
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
              showRenewalButton={showRenewalButton}
              onRenewClick={handleManualRenewalOpen}
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

                  <Card className="w-full overflow-visible lg:overflow-hidden lg:min-h-[340px] flex flex-col">
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

          {showRenewalModal && (
            <BudgetRenewalModal
              isOpen={showRenewalModal}
              carryover={carryover}
              currency={currency}
              onRenew={handleRenewBudget}
              onDismiss={handleDismissRenewal}
              isRenewing={isRenewing}
              isDismissing={isDismissing}
            />
          )}
          {isManualRenewalOpen && (
            <ManualBudgetRenewalModal
              isOpen={isManualRenewalOpen}
              carryover={carryover}
              currency={currency}
              onClose={handleManualRenewalClose}
              onRenew={async () => {
                await handleRenewBudget();
                setIsManualRenewalOpen(false);
              }}
              isRenewing={isRenewing}
            />
          )}
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
