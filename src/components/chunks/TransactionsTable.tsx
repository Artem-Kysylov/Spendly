// Imports
import { useState } from "react";
import { Trash, Pencil } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";

// Import shadcn components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Import components
import { Button } from "@/components/ui/button";
import DeleteModal from "../modals/DeleteModal";
import EditTransactionModal from "../modals/EditTransactionModal";

// Import types
import { TransactionsTableProps } from "../../types/types";
import type { Transaction, EditTransactionPayload } from "../../types/types";
import { supabase } from "../../lib/supabaseClient";
import { UserAuth } from "../../context/AuthContext";
import { Pagination } from "@/components/ui/pagination";

// Расширенный интерфейс для поддержки фильтрации
interface EnhancedTransactionsTableProps extends TransactionsTableProps {
  // Дополнительные опции для фильтрации и сортировки
  sortBy?: "date" | "amount" | "title" | "type";
  sortOrder?: "asc" | "desc";
  showFilters?: boolean;
  emptyStateMessage?: string;
  onTransactionUpdate?: () => void;
  onEditClick?: (transaction: Transaction) => void;
}

function TransactionsTable({
  transactions,
  onDeleteTransaction,
  deleteModalConfig,
  onEditTransaction,
  allowTypeChange = true,
  sortBy = "date",
  sortOrder = "desc",
  showFilters = false,
  emptyStateMessage,
  onTransactionUpdate,
  onEditClick,
}: EnhancedTransactionsTableProps) {
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Edit modal state
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const { session } = UserAuth();

  // Инициализация переводов для таблицы транзакций
  const tTransactions = useTranslations("transactions");

  // Пагинация
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Улучшенная сортировка транзакций
  const sortedTransactions = [...transactions].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "date":
        comparison =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case "amount":
        comparison = a.amount - b.amount;
        break;
      case "title":
        comparison = a.title.localeCompare(b.title);
        break;
      case "type":
        comparison = a.type.localeCompare(b.type);
        break;
      default:
        comparison =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }

    return sortOrder === "desc" ? -comparison : comparison;
  });

  const handleOpenModal = (id: string) => {
    setSelectedTransactionId(id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTransactionId(null);
  };

  const handleConfirmDelete = async () => {
    if (selectedTransactionId) {
      await onDeleteTransaction(selectedTransactionId);
      handleCloseModal();
      // Вызываем колбэк обновления если он есть
      onTransactionUpdate?.();
    }
  };

  const updateTransactionDirect = async (payload: EditTransactionPayload) => {
    if (!session?.user?.id) throw new Error("No session user id");
    console.log("[TransactionsTable] Fallback update:", payload);

    const updateData: any = {
      title: payload.title,
      amount: payload.amount,
      type: payload.type,
    };

    // Добавляем created_at только если он передан
    if (payload.created_at) {
      updateData.created_at = payload.created_at;
    }

    const { error } = await supabase
      .from("transactions")
      .update(updateData)
      .eq("id", payload.id)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("[TransactionsTable] Fallback update error:", error);
      throw error;
    }
  };

  // Если нет транзакций, показываем сообщение
  const effectiveEmptyMessage =
    emptyStateMessage ?? tTransactions("table.empty.default");
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 mb-24">
        <p className="text-muted-foreground">{effectiveEmptyMessage}</p>
      </div>
    );
  }

  return (
    <motion.div
      className="relative mb-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Мобильная версия - карточки */}
      <div className="block md:hidden space-y-3">
        {sortedTransactions.map((transaction, index) => (
          <motion.div
            key={transaction.id}
            className="bg-card border border-border rounded-lg p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.05 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-lg">
                <span>{transaction.category_emoji || "🧾"}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate text-foreground">
                  {transaction.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(transaction.created_at).toLocaleDateString()}
                  {transaction.category_name
                    ? ` • ${transaction.category_name}`
                    : ""}
                </div>
              </div>
              <div
                className={`${transaction.type === "expense" ? "text-error" : "text-success"} font-bold`}
              >
                ${transaction.amount}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-primary"
                  onClick={() => {
                    if (onEditClick) {
                      onEditClick(transaction);
                    } else {
                      setEditingTransaction(transaction);
                      setIsEditOpen(true);
                    }
                  }}
                >
                  <Pencil size={16} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-error"
                  onClick={() => {
                    setSelectedTransactionId(transaction.id);
                    setIsModalOpen(true);
                  }}
                >
                  <Trash size={16} />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Десктопная версия - таблица */}
      <motion.div
        className="hidden md:block w-full overflow-x-auto rounded-lg border border-border bg-card shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
      >
        <Table className="w-full">
          <TableHeader className="border-b border-border">
            <TableHead className="!text-[16px] font-semibold text-foreground">
              {tTransactions("table.headers.title")}
            </TableHead>
            <TableHead className="!text-[16px] font-semibold text-foreground">
              {tTransactions("table.headers.budget")}
            </TableHead>
            <TableHead className="!text-[16px] font-semibold text-foreground">
              {tTransactions("table.headers.amount")}
            </TableHead>
            <TableHead className="!text-[16px] font-semibold text-foreground">
              {tTransactions("table.headers.type")}
            </TableHead>
            <TableHead className="!text-[16px] font-semibold text-foreground">
              {tTransactions("table.headers.date")}
            </TableHead>
            <TableHead className="!text-[16px] font-semibold text-foreground">
              {tTransactions("table.headers.actions")}
            </TableHead>
          </TableHeader>
          <TableBody>
            {sortedTransactions.map((transaction, index) => (
              <motion.tr
                key={transaction.id}
                className="border-b border-border hover:bg-muted/30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  ease: "easeOut",
                  delay: 0.3 + index * 0.1,
                }}
              >
                <TableCell
                  className="text-foreground font-medium max-w-[200px] truncate"
                  title={transaction.title}
                >
                  {transaction.title}
                </TableCell>
                <TableCell className="text-foreground whitespace-nowrap">
                  {transaction.category_emoji && transaction.category_name ? (
                    <span className="flex items-center gap-1">
                      <span>{transaction.category_emoji}</span>
                      <span>{transaction.category_name}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">
                      {tTransactions("table.unbudgeted")}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-foreground font-semibold whitespace-nowrap">
                  ${transaction.amount}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      transaction.type === "expense"
                        ? "border-red-200 text-red-700 bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:bg-red-900/10"
                        : "border-green-200 text-green-700 bg-green-50 dark:border-green-900/30 dark:text-green-400 dark:bg-green-900/10"
                    }`}
                  >
                    {transaction.type === "expense" ? "Expense" : "Income"}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                  {new Date(transaction.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-primary hover:bg-blue-50"
                      onClick={() => {
                        if (onEditClick) {
                          onEditClick(transaction);
                        } else {
                          setEditingTransaction(transaction);
                          setIsEditOpen(true);
                        }
                      }}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-error hover:bg-red-50"
                      onClick={() => {
                        setSelectedTransactionId(transaction.id);
                        setIsModalOpen(true);
                      }}
                    >
                      <Trash size={16} />
                    </Button>
                  </div>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </motion.div>

      {/* Delete modal */}
      {isModalOpen && selectedTransactionId && (
        <DeleteModal
          title={
            deleteModalConfig?.title ?? tTransactions("table.modal.deleteTitle")
          }
          text={
            deleteModalConfig?.text ?? tTransactions("table.modal.deletePrompt")
          }
          onClose={() => setIsModalOpen(false)}
          onConfirm={() => {
            if (selectedTransactionId) {
              onDeleteTransaction(selectedTransactionId).finally(() => {
                setIsModalOpen(false);
                onTransactionUpdate?.();
              });
            }
          }}
        />
      )}
      {/* Edit modal */}
      {isEditOpen && editingTransaction && (
        <EditTransactionModal
          title={tTransactions("table.modal.editTitle")}
          onClose={() => {
            setIsEditOpen(false);
            setEditingTransaction(null);
          }}
          isLoading={isEditing}
          initialData={{
            id: editingTransaction.id,
            title: editingTransaction.title,
            amount: editingTransaction.amount,
            type: editingTransaction.type,
            budget_folder_id: editingTransaction.budget_folder_id ?? null,
            created_at: editingTransaction.created_at,
          }}
          allowTypeChange={allowTypeChange}
          onSubmit={async (payload) => {
            try {
              setIsEditing(true);
              console.log(
                "[TransactionsTable] Submitting edit payload:",
                payload,
              );
              if (onEditTransaction) {
                await onEditTransaction(payload);
              } else {
                await updateTransactionDirect(payload);
                window.dispatchEvent(new CustomEvent("budgetTransactionAdded"));
              }
              setIsEditOpen(false);
              setEditingTransaction(null);
              // Вызываем колбэк обновления если он есть
              onTransactionUpdate?.();
            } catch (e) {
              console.error("[TransactionsTable] Edit submit failed:", e);
            } finally {
              setIsEditing(false);
            }
          }}
        />
      )}
    </motion.div>
  );
}

export default TransactionsTable;
