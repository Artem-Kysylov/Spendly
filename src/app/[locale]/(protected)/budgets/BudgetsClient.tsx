"use client";

import { BarChart3 } from "lucide-react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import NewBudget from "@/components/budgets/AddNewBudget";
import BudgetComparisonChart from "@/components/budgets/BudgetComparisonChart";
import BudgetFolderItem from "@/components/budgets/BudgetFolderItem";
import SpendlyPalInsightCard from "@/components/budgets/SpendlyPalInsightCard";
import UpgradeCornerPanel from "@/components/free/UpgradeCornerPanel";
import NewBudgetModal from "@/components/modals/BudgetModal";
import ToastMessage from "@/components/ui-elements/ToastMessage";
import { UserAuth } from "@/context/AuthContext";
import { useBudgets } from "@/hooks/useBudgets";
import useDeviceType from "@/hooks/useDeviceType";
import useModal from "@/hooks/useModal";
import { useSubscription } from "@/hooks/useSubscription";
import { useTransactionsData } from "@/hooks/useTransactionsData";
import { Link } from "@/i18n/routing";
import { computeCarry } from "@/lib/budgetRollover";
import { getPreviousMonthRange } from "@/lib/dateUtils";
import { supabase } from "@/lib/supabaseClient";
import type { BarChartData, BudgetFolderItemProps, ToastMessageProps, BudgetInsight } from "@/types/types";
export default function BudgetsClient() {
  const { session } = UserAuth();
  const locale = useLocale();
  const [toastMessage, setToastMessage] = useState<ToastMessageProps | null>(
    null,
  );
  const [insights, setInsights] = useState<BudgetInsight[]>([]);
  const [lastRenewalDate, setLastRenewalDate] = useState<string | null>(null);
  const [budgetFolders, setBudgetFolders] = useState<BudgetFolderItemProps[]>(
    [],
  );
  const { isModalOpen, openModal, closeModal } = useModal();
  const tBudgets = useTranslations("budgets");
  const tModals = useTranslations("modals");
  const tCommon = useTranslations("common");
  const { subscriptionPlan, isLoading: isSubscriptionLoading } =
    useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [currency, setCurrency] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("user-currency") || "USD";
    }
    const base = locale.split("-")[0];
    if (base === "uk") return "UAH";
    if (base === "ru") return "RUB";
    if (base === "ja") return "JPY";
    if (base === "ko") return "KRW";
    if (base === "id") return "IDR";
    if (base === "hi") return "INR";
    return "USD";
  });

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    let cancelled = false;
    (async () => {
      try {
        const { data: userSettings } = await supabase
          .from("user_settings")
          .select("currency")
          .eq("user_id", userId)
          .maybeSingle();

        const next = userSettings?.currency;
        if (!cancelled && typeof next === "string" && next.length > 0) {
          setCurrency(next);
          try {
            window.localStorage.setItem("user-currency", next);
          } catch {
            // no-op
          }
        }
      } catch {
        // no-op
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // Тип устройства и состояние ховера для графика
  const { isDesktop } = useDeviceType();
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Fetch last_renewal_date for cyclic budget calculations
  useEffect(() => {
    const fetchLastRenewalDate = async () => {
      if (!session?.user?.id) return;
      const { data } = await supabase
        .from("main_budget_state")
        .select("last_renewal_date")
        .eq("user_id", session.user.id)
        .maybeSingle();
      
      setLastRenewalDate(data?.last_renewal_date || null);
    };
    fetchLastRenewalDate();
  }, [session?.user?.id]);

  // Транзакции для расчета потраченного по бюджетам
  const { allTransactions, isLoading: isTransactionsLoading } =
    useTransactionsData({
      period: "Month",
      dataType: "Expenses",
    });

  const spentByBudget = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const t of allTransactions) {
      if (t.type === "expense" && t.budget_folder_id) {
        const budget = budgetFolders.find(b => b.id === t.budget_folder_id);
        
        // For cyclic budgets, only count transactions after last_renewal_date
        if (budget?.is_cyclic && lastRenewalDate) {
          const transactionDate = new Date(t.created_at);
          const renewalDate = new Date(lastRenewalDate);
          if (transactionDate < renewalDate) {
            continue; // Skip transactions before renewal
          }
        }
        
        acc[t.budget_folder_id] = (acc[t.budget_folder_id] || 0) + t.amount;
      }
    }
    return acc;
  }, [allTransactions, budgetFolders, lastRenewalDate]);

  // Синхронизация папок бюджета с хуком
  const { budgets, isLoading: _isBudgetsLoading, refetch } = useBudgets();
  useEffect(() => {
    setBudgetFolders(budgets);
  }, [budgets]);

  // Fetch insights
  useEffect(() => {
    const fetchInsights = async () => {
      if (!session?.user?.id) return;
      const { data, error } = await supabase
        .from("budget_insights")
        .select(`
          id,
          user_id,
          budget_folder_id,
          insight_type,
          cycle_date,
          amount_saved,
          dismissed,
          created_at,
          dismissed_at,
          budget_folders!inner(name, emoji)
        `)
        .eq("user_id", session.user.id)
        .eq("dismissed", false)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching insights:", error);
        return;
      }

      const formattedInsights: BudgetInsight[] = (data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        budget_folder_id: item.budget_folder_id,
        budget_name: item.budget_folders?.name,
        budget_emoji: item.budget_folders?.emoji,
        insight_type: item.insight_type,
        cycle_date: item.cycle_date,
        amount_saved: item.amount_saved,
        dismissed: item.dismissed,
        created_at: item.created_at,
        dismissed_at: item.dismissed_at,
      }));

      setInsights(formattedInsights);
    };

    fetchInsights();
  }, [session?.user?.id]);

  // Лимит для Free плана (например, 3 бюджета)
  const isLimitReached =
    !isSubscriptionLoading &&
    subscriptionPlan === "free" &&
    budgetFolders.length >= 3;

  // Тосты
  const handleToastMessage = (
    text: string,
    type: ToastMessageProps["type"],
  ) => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDismissInsight = async (insightId: string) => {
    if (!session?.user?.id) return;
    const { error } = await supabase
      .from("budget_insights")
      .update({ dismissed: true, dismissed_at: new Date().toISOString() })
      .eq("id", insightId)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error dismissing insight:", error);
      handleToastMessage(tCommon("unexpectedError"), "error");
      return;
    }

    setInsights((prev) => prev.filter((i) => i.id !== insightId));
  };

  // Ограничение показа апгрейд‑попапа
  const canShowUpgradePopup = () => {
    try {
      const count = parseInt(
        window.localStorage.getItem("spendly:upgrade_popup_count") || "0",
        10,
      );
      return count < 3;
    } catch {
      return true;
    }
  };

  const markUpgradePopupShown = () => {
    try {
      const count = parseInt(
        window.localStorage.getItem("spendly:upgrade_popup_count") || "0",
        10,
      );
      window.localStorage.setItem(
        "spendly:upgrade_popup_count",
        String(count + 1),
      );
    } catch {
      // no-op
    }
  };

  // Создание новой папки бюджета (используется в модалке)
  const handleBudgetSubmit = async (
    emoji: string,
    name: string,
    amount: number,
    type: "expense" | "income",
    color_code?: string | null,
    rolloverEnabled?: boolean,
    rolloverMode?: "positive-only" | "allow-negative",
    rolloverCap?: number | null,
    is_cyclic?: boolean,
  ): Promise<void> => {
    if (!session?.user?.id) {
      throw new Error("Not authenticated");
    }
    try {
      // первичная попытка — с колонками переноса
      const { error: insertErr } = await supabase
        .from("budget_folders")
        .insert({
          user_id: session.user.id,
          emoji,
          name,
          amount,
          type,
          color_code: color_code ?? null,
          rollover_enabled: type === "expense" && !is_cyclic ? true : false,
          rollover_mode:
            type === "expense" && !is_cyclic ? (rolloverMode ?? "positive-only") : null,
          rollover_cap: type === "expense" && !is_cyclic ? (rolloverCap ?? null) : null,
          is_cyclic: type === "expense" ? !!is_cyclic : false,
        })
        .select();
      if (insertErr) {
        // если колонок нет — повторяем без них
        console.warn(
          "Insert with rollover fields failed, retrying without:",
          insertErr?.message,
        );
        const { error: fallbackErr } = await supabase
          .from("budget_folders")
          .insert({
            user_id: session.user.id,
            emoji,
            name,
            amount,
            type,
            color_code: color_code ?? null,
          })
          .select();
        if (fallbackErr) throw fallbackErr;
      }

      handleToastMessage(tBudgets("list.toast.createSuccess"), "success");
      await refetch();
    } catch (err) {
      console.error("Error creating budget folder:", err);
      handleToastMessage(tCommon("unexpectedError"), "error");
      throw err;
    }
  };

  // Данные для сравнительного графика
  const chartData = useMemo(() => {
    const data: BarChartData[] = budgetFolders.map((folder) => ({
      category: folder.emoji ? `${folder.emoji} ${folder.name}` : folder.name,
      amount: spentByBudget[folder.id] || 0,
      // цвет бара = цвет бюджета, иначе primary
      fill: folder.color_code ? `#${folder.color_code}` : "hsl(var(--primary))",
      emoji: folder.emoji,
    }));

    const unbudgetedAmount = allTransactions.reduce((sum, t) => {
      if (t.type === "expense" && !t.budget_folder_id) {
        return sum + t.amount;
      }
      return sum;
    }, 0);

    if (unbudgetedAmount > 0) {
      data.push({
        category: tModals("transaction.select.unbudgeted"),
        amount: unbudgetedAmount,
        fill: "hsl(var(--muted-foreground))",
      });
    }

    return data;
  }, [allTransactions, budgetFolders, spentByBudget, tModals]);

  const [prevSpentByBudget, setPrevSpentByBudget] = useState<
    Record<string, number>
  >({});
  const [rolloverPreviewById, setRolloverPreviewById] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    const fetchPrevMonthSpent = async () => {
      if (!session?.user?.id) return;
      const { start, end } = getPreviousMonthRange();
      const { data, error } = await supabase
        .from("transactions")
        .select("amount, type, budget_folder_id, created_at")
        .eq("user_id", session.user.id)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
      if (error) {
        console.error("Error fetching previous month transactions:", error);
        return;
      }
      const acc: Record<string, number> = {};
      for (const t of data || []) {
        if (t.type === "expense" && t.budget_folder_id) {
          acc[t.budget_folder_id] = (acc[t.budget_folder_id] || 0) + t.amount;
        }
      }
      setPrevSpentByBudget(acc);
    };
    fetchPrevMonthSpent();
  }, [session?.user?.id]);

  useEffect(() => {
    const next: Record<string, number> = {};
    for (const folder of budgetFolders) {
      if (folder.type === "expense") {
        const prev = prevSpentByBudget[folder.id];
        
        // If no previous month data exists, rollover should be 0 (new budget)
        if (prev === undefined) {
          next[folder.id] = 0;
          continue;
        }
        
        const rollover = folder as unknown as {
          rollover_mode?: "positive-only" | "allow-negative";
          rollover_cap?: number | null;
          rollover_enabled?: boolean;
        };
        const mode = rollover.rollover_mode ?? "positive-only";
        const cap = rollover.rollover_cap ?? null;
        const enabled = rollover.rollover_enabled ?? true;
        next[folder.id] = enabled
          ? computeCarry(folder.amount, prev, mode, cap)
          : 0;
      }
    }
    setRolloverPreviewById(next);
  }, [budgetFolders, prevSpentByBudget]);

  const _rolloverTotals = useMemo(() => {
    let positive = 0;
    let negative = 0;
    for (const folder of budgetFolders) {
      const carry = rolloverPreviewById[folder.id];
      if (typeof carry !== "number") continue;
      if (carry >= 0) positive += carry;
      else negative += -carry;
    }
    return { positive, negative };
  }, [budgetFolders, rolloverPreviewById]);

  return (
    <div className="pb-0 md:pb-20">
      <div className="flex items-center justify-between px-4 pt-6 pb-4 md:px-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          {tBudgets("meta.title")}
        </h1>
      </div>

      <div className="px-4 md:px-6">
        {toastMessage && (
          <ToastMessage text={toastMessage.text} type={toastMessage.type} />
        )}
        {showUpgrade && <UpgradeCornerPanel />}

        {/* Spendly Pal Insight Cards */}
        {insights.length > 0 && (
          <div className="mb-6 space-y-4">
            {insights.map((insight) => (
              <SpendlyPalInsightCard
                key={insight.id}
                insight={insight}
                currency={currency}
                onDismiss={handleDismissInsight}
              />
            ))}
          </div>
        )}

        {/* Аналитика: мобильная — скрываема; десктоп — всегда видна */}
        <motion.div
          style={{ willChange: "opacity" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.28 }}
          className="mb-6"
        >
          {isDesktop ? (
            <BudgetComparisonChart
              data={chartData}
              isLoading={isTransactionsLoading}
              currency={currency}
              onBarHover={(idx) => setHoveredIndex(idx)}
              onBarLeave={() => setHoveredIndex(null)}
            />
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                className="h-[60px] w-full px-4 rounded-lg bg-card border border-border transition-colors flex items-center justify-between"
                onClick={() => setIsAnalyticsOpen((v) => !v)}
              >
                <span className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <BarChart3 className="w-4 h-4 text-foreground" aria-hidden />
                  {isAnalyticsOpen ? "Hide Analytics" : "Show Analytics"}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className={`h-5 w-5 text-muted-foreground transition-transform ${isAnalyticsOpen ? "rotate-180" : "rotate-0"}`}
                >
                  <title>
                    {isAnalyticsOpen ? "Hide Analytics" : "Show Analytics"}
                  </title>
                  <path d="M12 15.5a1 1 0 0 1-.71-.29l-5.5-5.5a1 1 0 1 1 1.42-1.42L12 12.38l4.79-4.79a1 1 0 0 1 1.42 1.42l-5.5 5.5a1 1 0 0 1-.71.29z" />
                </svg>
              </button>
              {isAnalyticsOpen && (
                <BudgetComparisonChart
                  data={chartData}
                  isLoading={isTransactionsLoading}
                  currency={currency}
                  onBarHover={(idx) => isDesktop && setHoveredIndex(idx)}
                  onBarLeave={() => setHoveredIndex(null)}
                  className="w-full"
                />
              )}
            </div>
          )}
        </motion.div>

        {/* Кнопка создания бюджета — на мобиле остаётся отдельным полноширинным блоком */}
        {!isDesktop && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ willChange: "opacity, transform" }}
            className="mb-5 w-full"
          >
            <NewBudget
              onClick={() => {
                if (
                  subscriptionPlan !== "pro" &&
                  isSubscriptionLoading &&
                  budgetFolders.length >= 3
                ) {
                  return;
                }
                if (isLimitReached) {
                  handleToastMessage(
                    tBudgets("list.toast.limitReached"),
                    "error",
                  );
                  if (canShowUpgradePopup()) {
                    setShowUpgrade(true);
                    markUpgradePopupShown();
                  }
                  return;
                }
                openModal();
              }}
              disabled={isLimitReached}
            />
          </motion.div>
        )}

        {/* Карточки бюджетов: на десктопе 4 в ряд, первой идёт кнопка создания */}
        <motion.div
          style={{ willChange: "opacity" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.28 }}
          className="grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-6"
        >
          {isDesktop && (
            <motion.div
              style={{ willChange: "opacity, transform" }}
              className="w-full cursor-pointer"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            >
              <NewBudget
                onClick={() => {
                  if (
                    subscriptionPlan !== "pro" &&
                    isSubscriptionLoading &&
                    budgetFolders.length >= 3
                  ) {
                    return;
                  }
                  if (isLimitReached) {
                    handleToastMessage(
                      tBudgets("list.toast.limitReached"),
                      "error",
                    );
                    if (canShowUpgradePopup()) {
                      setShowUpgrade(true);
                      markUpgradePopupShown();
                    }
                    return;
                  }
                  openModal();
                }}
                disabled={isLimitReached}
              />
            </motion.div>
          )}

          {budgetFolders.map((folder, index) => (
            <motion.div
              key={folder.id}
              style={{ willChange: "opacity, transform" }}
              className={`w-full cursor-pointer ${hoveredIndex === index ? "ring-2 ring-primary/80 bg-primary/5 scale-[1.01] transition" : ""}`}
            >
              {/* типизированный маршрут для next-intl */}
              <Link
                href={{ pathname: "/budgets/[id]", params: { id: folder.id } }}
              >
                <BudgetFolderItem
                  id={folder.id}
                  emoji={folder.emoji}
                  name={folder.name}
                  amount={folder.amount}
                  type={folder.type}
                  color_code={folder.color_code}
                  currency={currency}
                  rolloverPreviewCarry={rolloverPreviewById[folder.id]}
                  rollover_carry={folder.rollover_carry}
                  is_cyclic={folder.is_cyclic}
                />
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {isModalOpen && (
          <NewBudgetModal
            onClose={closeModal}
            onSubmit={handleBudgetSubmit}
            title={tBudgets("list.modal.createTitle")}
          />
        )}
      </div>

    </div>
  );
}
