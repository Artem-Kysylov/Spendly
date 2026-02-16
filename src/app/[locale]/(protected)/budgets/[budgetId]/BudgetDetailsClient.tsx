"use client";

import { Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import BudgetDetailsControls from "@/components/budgets/BudgetDetailsControls";
import BudgetDetailsForm from "@/components/budgets/BudgetDetailsForm";
import BudgetDetailsInfo from "@/components/budgets/BudgetDetailsInfo";
import MobileTransactionCard from "@/components/chunks/MobileTransactionCard";
import TransactionsTable from "@/components/chunks/TransactionsTable";
import BudgetModal from "@/components/modals/BudgetModal";
import DeleteModal from "@/components/modals/DeleteModal";
import TransactionModal from "@/components/modals/TransactionModal";
import Button from "@/components/ui-elements/Button";
import Spinner from "@/components/ui-elements/Spinner";
import ToastMessage from "@/components/ui-elements/ToastMessage";
import { UserAuth } from "@/context/AuthContext";
import { useBudgetTransactionsInfinite } from "@/hooks/useBudgetTransactionsInfinite";
import useModal from "@/hooks/useModal";
import { useRouter } from "@/i18n/routing";
import { computeCarry } from "@/lib/budgetRollover";
import { getPreviousMonthRange } from "@/lib/dateUtils";
import { supabase } from "@/lib/supabaseClient";
import { isValidAmountInput, parseAmountInput } from "@/lib/utils";
import type {
  BudgetDetailsProps,
  EditTransactionPayload,
  ToastMessageProps,
  Transaction,
} from "@/types/types";

export default function BudgetDetailsClient() {
  const { budgetId } = useParams<{ budgetId: string }>();
  const id = budgetId as string;
  const router = useRouter();
  const { session } = UserAuth();
  const userId = session?.user?.id;

  const {
    isModalOpen: isDeleteModalOpen,
    openModal: openDeleteModal,
    closeModal: closeDeleteModal,
  } = useModal();
  const {
    isModalOpen: isEditModalOpen,
    openModal: openEditModal,
    closeModal: closeEditModal,
  } = useModal();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<ToastMessageProps | null>(
    null,
  );
  const [budgetDetails, setBudgetDetails] = useState<BudgetDetailsProps>({
    emoji: "😊",
    name: "Loading...",
    amount: 0,
    type: "expense",
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [rolloverPreview, setRolloverPreview] = useState<number>(0);

  type RolloverMode = "positive-only" | "allow-negative";
  type BudgetRolloverFields = {
    rollover_enabled?: boolean;
    rollover_mode?: RolloverMode | null;
    rollover_cap?: number | null;
  };

  const SKELETON_KEYS = [
    "skeleton-0",
    "skeleton-1",
    "skeleton-2",
    "skeleton-3",
    "skeleton-4",
  ];

  // Infinite scroll hook
  const {
    transactions,
    groupedTransactions,
    isLoading: isTransactionsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchTransactions,
  } = useBudgetTransactionsInfinite({ budgetId: id });

  // Intersection Observer for infinite scroll
  const observerTarget = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage &&
          !isTransactionsLoading
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
  }, [hasNextPage, isFetchingNextPage, isTransactionsLoading, fetchNextPage]);

  const tBudgets = useTranslations("budgets");
  const tCommon = useTranslations("common");
  const tTransactions = useTranslations("transactions");

  const handleToastMessage = (
    text: string,
    type: ToastMessageProps["type"],
  ) => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchBudgetDetails = useCallback(async () => {
    if (!userId || !id) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("budget_folders")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .single();
      if (error) {
        console.error("Error fetching budget details:", error);
        return;
      }
      if (data) setBudgetDetails(data as BudgetDetailsProps);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id, userId]);

  const fetchRolloverPreview = useCallback(
    async (details: BudgetDetailsProps) => {
      if (!userId || !id || details.type !== "expense") return;

      try {
        const { start, end } = getPreviousMonthRange();
        const { data, error } = await supabase
          .from("transactions")
          .select("amount, type")
          .eq("budget_folder_id", id)
          .eq("user_id", userId)
          .eq("type", "expense")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString());

        if (error) {
          console.error("Error fetching previous month transactions:", error);
          return;
        }

        const prevSpent = data?.reduce((sum, tx) => sum + tx.amount, 0) || 0;

        // Get rollover settings from budgetDetails
        const rollover = details as unknown as BudgetRolloverFields;
        const rolloverEnabled = rollover.rollover_enabled ?? true;
        const rolloverMode = rollover.rollover_mode ?? "positive-only";
        const rolloverCap = rollover.rollover_cap ?? null;

        const carry = rolloverEnabled
          ? computeCarry(details.amount, prevSpent, rolloverMode, rolloverCap)
          : 0;

        setRolloverPreview(carry);
      } catch (error) {
        console.error("Error calculating rollover:", error);
      }
    },
    [id, userId],
  );

  useEffect(() => {
    fetchBudgetDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchBudgetDetails]);

  useEffect(() => {
    // Fetch rollover preview after budget details are loaded
    if (
      budgetDetails.name !== "Loading..." &&
      budgetDetails.type === "expense"
    ) {
      fetchRolloverPreview(budgetDetails);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetDetails, fetchRolloverPreview]);

  const handleTransactionSubmit = async (
    title: string,
    amount: string,
    date: Date,
  ) => {
    if (!session?.user?.id || !id) return;
    if (!isValidAmountInput(amount)) {
      handleToastMessage(tCommon("unexpectedError"), "error");
      return;
    }
    const parsedAmount = parseAmountInput(amount);
    try {
      const { data: budgetData, error: budgetError } = await supabase
        .from("budget_folders")
        .select("type")
        .eq("id", id)
        .single();
      if (budgetError || !budgetData?.type) {
        handleToastMessage(
          tBudgets("details.toast.failedDetermineType"),
          "error",
        );
        return;
      }
      setIsSubmitting(true);
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          budget_folder_id: id,
          user_id: session.user.id,
          title,
          amount: parsedAmount,
          type: budgetData.type,
          created_at: date.toISOString(),
        })
        .select();
      if (transactionError) {
        handleToastMessage(tBudgets("details.toast.addFailed"), "error");
        return;
      }
      handleToastMessage(tBudgets("details.toast.addSuccess"), "success");
      refetchTransactions();
      window.dispatchEvent(new CustomEvent("budgetTransactionAdded"));
    } catch (error) {
      console.error("Error:", error);
      handleToastMessage(tCommon("unexpectedError"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBudget = async () => {
    if (!session?.user?.id || !id) return;
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from("budget_folders")
        .delete()
        .eq("id", id)
        .eq("user_id", session.user.id);
      if (error) {
        handleToastMessage(tBudgets("details.toast.deleteFailed"), "error");
        return;
      }
      handleToastMessage(tBudgets("details.toast.deleteSuccess"), "success");
      setTimeout(() => {
        router.push("/budgets");
      }, 2000);
    } catch (error) {
      console.error("Error:", error);
      handleToastMessage(tCommon("unexpectedError"), "error");
    } finally {
      setIsDeleting(false);
      closeDeleteModal();
    }
  };

  const handleUpdateBudget = async (
    emoji: string,
    name: string,
    amount: number,
    type: "expense" | "income",
    color_code?: string | null,
    rolloverEnabled?: boolean,
    rolloverMode?: "positive-only" | "allow-negative",
    rolloverCap?: number | null,
  ) => {
    if (!session?.user?.id || !id) return;
    try {
      setIsSubmitting(true);
      const { error: updateErr } = await supabase
        .from("budget_folders")
        .update({
          emoji,
          name,
          amount,
          type,
          color_code: color_code ?? null,
          rollover_enabled: type === "expense" ? !!rolloverEnabled : false,
          rollover_mode:
            type === "expense" ? (rolloverMode ?? "positive-only") : null,
          rollover_cap: type === "expense" ? (rolloverCap ?? null) : null,
        })
        .eq("id", id)
        .eq("user_id", session.user.id);

      if (updateErr) {
        console.warn(
          "Update with rollover fields failed, retrying without:",
          updateErr?.message,
        );
        const { error: fallbackErr } = await supabase
          .from("budget_folders")
          .update({ emoji, name, amount, type, color_code: color_code ?? null })
          .eq("id", id)
          .eq("user_id", session.user.id);
        if (fallbackErr) {
          handleToastMessage(tBudgets("details.toast.updateFailed"), "error");
          return;
        }
      }

      handleToastMessage("Budget updated successfully!", "success");
      closeEditModal();
      fetchBudgetDetails();
    } catch (error) {
      console.error("Error:", error);
      handleToastMessage(tCommon("unexpectedError"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!session?.user?.id || !transactionId) return;
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId)
        .eq("user_id", session.user.id);

      if (error) {
        console.error("Error deleting transaction:", error);
        handleToastMessage(tCommon("unexpectedError"), "error");
        return;
      }

      handleToastMessage(tTransactions("toast.deleteSuccess"), "success");
      refetchTransactions();
    } catch (error) {
      console.error("Error:", error);
      handleToastMessage(tCommon("unexpectedError"), "error");
    }
  };

  const handleEditTransaction = async (payload: EditTransactionPayload) => {
    if (!session?.user?.id || !payload?.id) return;
    try {
      const updates: Partial<EditTransactionPayload> & { created_at?: string } =
        {
          title: payload.title,
          amount: payload.amount,
          type: payload.type,
        };
      if (payload.budget_folder_id !== undefined) {
        updates.budget_folder_id = payload.budget_folder_id;
      }
      if (payload.created_at) {
        updates.created_at = payload.created_at;
      }

      const { error } = await supabase
        .from("transactions")
        .update(updates)
        .eq("id", payload.id)
        .eq("user_id", session.user.id);

      if (error) {
        console.error("Error updating transaction:", error);
        handleToastMessage(tCommon("unexpectedError"), "error");
        return;
      }

      handleToastMessage("Transaction updated successfully!", "success");
      refetchTransactions();
      window.dispatchEvent(new CustomEvent("budgetTransactionAdded"));
    } catch (error) {
      console.error("Unexpected error during update:", error);
      handleToastMessage(tCommon("unexpectedError"), "error");
    }
  };

  const _handleTransactionUpdateSuccess = async () => {
    handleToastMessage("Transaction updated successfully!", "success");
    refetchTransactions();
    window.dispatchEvent(new CustomEvent("budgetTransactionAdded"));
  };

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div className="px-4 md:px-5 mt-[30px] space-y-6">
      {toastMessage && (
        <ToastMessage text={toastMessage.text} type={toastMessage.type} />
      )}

      <BudgetDetailsControls
        onDeleteClick={openDeleteModal}
        onEditClick={openEditModal}
      />

      {/* Мобильная версия: инфо + кнопка + список транзакций по группам */}
      <div className="block md:hidden">
        <div className="grid grid-cols-1 gap-6 items-stretch">
          <BudgetDetailsInfo
            id={id}
            emoji={budgetDetails.emoji}
            name={budgetDetails.name}
            amount={budgetDetails.amount}
            type={budgetDetails.type}
            color_code={budgetDetails.color_code ?? null}
            rolloverPreviewCarry={rolloverPreview}
          />
          <div className="mt-2">
            <Button
              text={tTransactions("addTransaction")}
              variant="default"
              className="w-full"
              onClick={() => setIsAddModalOpen(true)}
              icon={<Plus className="h-4 w-4" />}
            />
          </div>
          <div className="space-y-6">
            {isTransactionsLoading && transactions.length === 0 ? (
              <div className="space-y-4">
                {SKELETON_KEYS.map((k) => (
                  <div
                    key={k}
                    className="h-20 w-full rounded-xl bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">
                  {tTransactions("empty.description")}
                </p>
              </div>
            ) : (
              <>
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
                          onEdit={(tx) => setEditingTransaction(tx)}
                          onDelete={handleDeleteTransaction}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {/* Loading Indicator for Next Page */}
                <div ref={observerTarget} className="py-4 flex justify-center">
                  {isFetchingNextPage && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Loading more...
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Десктопная версия: инфо + форма + таблица */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <BudgetDetailsInfo
          id={id}
          emoji={budgetDetails.emoji}
          name={budgetDetails.name}
          amount={budgetDetails.amount}
          type={budgetDetails.type}
          color_code={budgetDetails.color_code ?? null}
          rolloverPreviewCarry={rolloverPreview}
        />
        <BudgetDetailsForm
          isSubmitting={isSubmitting}
          onSubmit={handleTransactionSubmit}
        />
      </div>

      <div className="hidden md:block space-y-4">
        {isTransactionsLoading && transactions.length === 0 ? (
          <div className="space-y-4">
            {SKELETON_KEYS.map((k) => (
              <div
                key={k}
                className="h-20 w-full rounded-xl bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">
              {tTransactions("empty.description")}
            </p>
          </div>
        ) : (
          <>
            <TransactionsTable
              transactions={transactions}
              onDeleteTransaction={handleDeleteTransaction}
              onEditTransaction={handleEditTransaction}
              onEditClick={(tx) => setEditingTransaction(tx)}
            />
            {/* Loading Indicator for Next Page */}
            <div ref={observerTarget} className="py-4 flex justify-center">
              {isFetchingNextPage && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Loading more...
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {isDeleteModalOpen && (
        <DeleteModal
          title={tBudgets("details.deleteModal.title")}
          text={tBudgets("details.deleteModal.text")}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteBudget}
          isLoading={isDeleting}
        />
      )}

      {isEditModalOpen && (
        <BudgetModal
          title={tBudgets("details.editModal.title")}
          initialData={{
            emoji: budgetDetails.emoji,
            name: budgetDetails.name,
            amount: budgetDetails.amount,
            type: budgetDetails.type,
            color_code: budgetDetails.color_code ?? null,
            rolloverEnabled:
              budgetDetails.rolloverEnabled ??
              (budgetDetails as unknown as BudgetRolloverFields)
                .rollover_enabled ??
              true,
            rolloverMode:
              budgetDetails.rolloverMode ??
              (budgetDetails as unknown as BudgetRolloverFields)
                .rollover_mode ??
              "positive-only",
          }}
          onClose={closeEditModal}
          onSubmit={handleUpdateBudget}
          isLoading={isSubmitting}
          handleToastMessage={handleToastMessage}
        />
      )}

      {isAddModalOpen && (
        <TransactionModal
          title={tTransactions("modal.addTitle")}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={(message: string, type: ToastMessageProps["type"]) => {
            handleToastMessage(message, type);
            refetchTransactions();
          }}
          initialBudgetId={id}
        />
      )}

      {editingTransaction && (
        <TransactionModal
          title={tTransactions("table.modal.editTitle")}
          initialData={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSubmit={(message: string, type: ToastMessageProps["type"]) => {
            handleToastMessage(message, type);
            refetchTransactions();
            setEditingTransaction(null);
          }}
        />
      )}
    </div>
  );
}
