"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";

import useModal from "@/hooks/useModal";
import useDeviceType from "@/hooks/useDeviceType";
import {
  useTransactionsInfinite,
  TransactionFilterType,
} from "@/hooks/useTransactionsInfinite";
import { useTransactionsData } from "@/hooks/useTransactionsData";
import { UserAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import {
  generateSpendingInsights,
  type SpendingInsights,
} from "@/app/[locale]/actions/get-insights";

import { Button } from "@/components/ui-elements";
import { AIInsightPreloader } from "@/components/ui-elements";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import MobileTransactionCard from "@/components/chunks/MobileTransactionCard";
import TransactionsTable from "@/components/chunks/TransactionsTable";
import TransactionModal from "@/components/modals/TransactionModal";
import { ExpensesBarChart } from "@/components/charts/TransactionsBarChart";
import { useToast } from "@/components/ui/use-toast";

import type { Transaction, ToastMessageProps } from "@/types/types";
import { ToastMessage } from "@/components/ui-elements";

export default function TransactionsClient() {
  const { session } = UserAuth();
  const t = useTranslations("transactions");
  const tCommon = useTranslations("common");
  const { isMobile } = useDeviceType();
  const { toast } = useToast();

  // Modal & Toast
  const { isModalOpen, openModal, closeModal } = useModal();
  const [toastMessage, setToastMessage] = useState<ToastMessageProps | null>(
    null,
  );
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  // Infinite Scroll Hook
  const {
    transactions,
    groupedTransactions,
    isLoading: isListLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    stats,
    refetch: refetchList,
  } = useTransactionsInfinite();

  // Chart Data Hook
  const {
    chartData,
    filters: chartFilters,
    isChartLoading,
  } = useTransactionsData();

  // UI State
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isAiSheetOpen, setIsAiSheetOpen] = useState(false);

  // AI Insights State
  const [insightsData, setInsightsData] = useState<SpendingInsights | null>(
    null,
  );
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Intersection Observer
  const observerTarget = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage &&
          !isListLoading
        ) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isListLoading, fetchNextPage]);

  // Handlers
  const handleToastMessage = (
    text: string,
    type: ToastMessageProps["type"],
  ) => {
    setToastMessage({ text, type });
    toast({
      variant: type === "success" ? "success" : "destructive",
      description: text,
      duration: 3000,
    });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleTransactionSubmit = (
    message: string,
    type: ToastMessageProps["type"],
  ) => {
    handleToastMessage(message, type);
    if (type === "success") {
      setTimeout(() => refetchList(), 1000);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!session?.user?.id || !id) return;

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", session.user.id);

      if (error) {
        console.error("Error deleting transaction:", error);
        handleToastMessage(t("toast.deleteFailed"), "error");
        return;
      }
      handleToastMessage(t("toast.deleteSuccess"), "success");
      setTimeout(() => refetchList(), 1000);
    } catch (error) {
      console.error("Error:", error);
      handleToastMessage(tCommon("unexpectedError"), "error");
    }
  };

  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    openModal();
  };

  const handleModalClose = () => {
    setEditingTransaction(null);
    closeModal();
  };

  const handleAddClick = () => {
    setEditingTransaction(null);
    openModal();
  };

  const handleAiSheetOpen = async () => {
    if (!session?.user?.id) return;

    setIsAiSheetOpen(true);
    setIsInsightsLoading(true);
    setInsightsError(null);

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30); // Last 30 days

      const data = await generateSpendingInsights({
        userId: session.user.id,
        startDate,
        endDate,
      });

      setInsightsData(data);
    } catch (error) {
      console.error("Failed to fetch AI insights:", error);
      setInsightsError(
        "Failed to generate insights. Please try again later.",
      );
    } finally {
      setIsInsightsLoading(false);
    }
  };

  // Десктоп: открыто, Мобайл: закрыто
  useEffect(() => {
    setIsAnalyticsOpen(!isMobile);
  }, [isMobile]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {toastMessage && (
        <ToastMessage text={toastMessage.text} type={toastMessage.type} />
      )}

      {/* 1. Page Header */}
      <div className="px-4 md:px-6 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {t("title")}
        </h1>
        <Button
          variant="default"
          onClick={handleAddClick}
          className="hidden md:inline-flex"
          text={
            <>
              <Plus size={16} className="mr-2 text-white" />
              {t("addTransaction")}
            </>
          }
        />
      </div>

      {/* 2. Summary Ribbon */}
      <div className="px-4 md:px-6 pb-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs uppercase tracking-wider font-medium">
              Total Spent
            </span>
            <span className="text-lg font-semibold text-foreground">
              $
              {stats.totalSpent.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs uppercase tracking-wider font-medium">
              Daily Avg
            </span>
            <span className="text-lg font-semibold text-foreground">
              $
              {stats.dailyAverage.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Collapsible Analytics */}
      <div className="px-4 md:px-6 mb-4">
        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors md:cursor-default md:hover:bg-card"
            onClick={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                Spending Analytics
              </span>
              {/* Chevron only on mobile */}
              <div className="md:hidden">
                {isAnalyticsOpen ? (
                  <ChevronUp size={16} className="text-muted-foreground" />
                ) : (
                  <ChevronDown size={16} className="text-muted-foreground" />
                )}
              </div>
            </div>

            <Sheet open={isAiSheetOpen} onOpenChange={setIsAiSheetOpen}>
              <SheetTrigger>
                <Button
                  variant="ghost"
                  className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10 gap-1.5 text-xs"
                  aria-label="AI Insights"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAiSheetOpen();
                  }}
                  text={
                    <>
                      <Sparkles size={14} />
                      <span className="font-medium">AI Insight</span>
                    </>
                  }
                />
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[300px] sm:w-[400px] bg-background border-r border-border flex flex-col overflow-hidden"
              >
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    AI Spending Insights
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 min-h-0 overflow-y-auto mt-6 px-1 pb-6">
                  {isInsightsLoading ? (
                    <AIInsightPreloader />
                  ) : insightsError ? (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                      {insightsError}
                    </div>
                  ) : insightsData ? (
                    <div className="space-y-3">
                      {/* Trend Card */}
                      <div className="p-4 bg-card border border-border rounded-lg shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">
                            {insightsData.trend.direction === "down"
                              ? "📉"
                              : insightsData.trend.direction === "up"
                                ? "📈"
                                : "➡️"}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              Spending Trend
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {insightsData.trend.message}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Top Category Card */}
                      <div className="p-4 bg-card border border-border rounded-lg shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">
                            {insightsData.topCategory.emoji}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              Top Category: {insightsData.topCategory.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              $
                              {insightsData.topCategory.amount.toLocaleString(
                                undefined,
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground mt-2">
                              {insightsData.topCategory.advice}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Financial Tip Card */}
                      <div className="p-4 bg-card border border-border rounded-lg shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">💡</div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground mb-2">
                              Financial Tip
                            </p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {insightsData.generalTip}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground text-center pt-2">
                        AI-generated based on your recent transactions.
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-muted/50 rounded-lg text-sm text-center text-muted-foreground">
                      Click the button to generate insights
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <AnimatePresence initial={false}>
            {(isAnalyticsOpen || !isMobile) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <div className="p-4 pt-0 border-t border-border">
                  <ExpensesBarChart
                    data={chartData}
                    filters={chartFilters}
                    isLoading={isChartLoading}
                    currency="USD"
                    height={300}
                    showGrid={true}
                    className="w-full shadow-none border-0"
                    layout={isMobile ? "vertical" : "horizontal"}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 4. Sticky Toolbar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-4 md:px-6 py-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("search.placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-muted/50 border-transparent focus:bg-background focus:border-primary transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            <div className="relative w-[140px]">
              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType(e.target.value as TransactionFilterType)
                }
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 appearance-none focus:bg-background focus:border-primary pl-9"
              >
                <option value="all">All Types</option>
                <option value="expense">Expenses</option>
                <option value="income">Income</option>
              </select>
              <Filter
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Infinite List */}
      <div className="flex-1 px-4 md:px-6 py-4">
        {isListLoading && transactions.length === 0 ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              {t("empty.filtered")}
            </h3>
            <p className="text-muted-foreground text-sm">
              {t("empty.description")}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Mobile View */}
            <div className="block md:hidden space-y-6">
              {Object.entries(groupedTransactions).map(([date, items]) => (
                <div key={date} className="space-y-3">
                  <div className="sticky top-[70px] z-[5] bg-background/95 backdrop-blur py-2 px-1 text-sm font-semibold text-muted-foreground border-b border-border/50">
                    {date}
                  </div>
                  <div className="space-y-3">
                    {items.map((transaction) => (
                      <MobileTransactionCard
                        key={transaction.id}
                        transaction={transaction}
                        onEdit={handleEditClick}
                        onDelete={handleDeleteTransaction}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
              <TransactionsTable
                transactions={transactions}
                onDeleteTransaction={handleDeleteTransaction}
                onEditClick={handleEditClick}
              />
            </div>

            {/* Loading Indicator for Next Page */}
            <div ref={observerTarget} className="py-4 flex justify-center">
              {isFetchingNextPage && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Loading more...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <TransactionModal
          title={
            editingTransaction ? t("modal.editTitle") : t("modal.addTitle")
          }
          initialData={editingTransaction || undefined}
          onClose={handleModalClose}
          onSubmit={(message, type) => {
            handleTransactionSubmit(message, type);
          }}
        />
      )}
    </div>
  );
}
