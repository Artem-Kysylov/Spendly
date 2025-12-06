import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { UserAuth } from "../../context/AuthContext";
import BudgetProgressBar from "../ui-elements/BudgetProgressBar";
import type { BudgetFolderItemProps } from "../../types/types";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/chartUtils";

function BudgetFolderItem({
  id,
  emoji,
  name,
  amount,
  type,
  color_code,
}: BudgetFolderItemProps) {
  const { session } = UserAuth();
  const [spentAmount, setSpentAmount] = useState(0);
  const tBudgets = useTranslations("budgets");

  const fetchSpentAmount = async () => {
    if (!session?.user?.id || !id) return;
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("amount, type")
        .eq("budget_folder_id", id)
        .eq("user_id", session.user.id);

      if (error) {
        console.error("Error fetching spent amount:", error);
        return;
      }

      // Суммируем транзакции по типу бюджета
      const total =
        data?.reduce((sum: number, tx: { amount: number; type: string }) => {
          const matchesType =
            tx.type === (type === "income" ? "income" : "expense");
          return matchesType ? sum + tx.amount : sum;
        }, 0) || 0;

      setSpentAmount(total);
    } catch (err) {
      console.error("Error:", err);
    }
  };

  useEffect(() => {
    fetchSpentAmount();
    const handleBudgetUpdate = () => fetchSpentAmount();
    window.addEventListener("budgetTransactionAdded", handleBudgetUpdate);
    return () => {
      window.removeEventListener("budgetTransactionAdded", handleBudgetUpdate);
    };
  }, [id, session?.user?.id]);

  return (
    <div
      className="flex flex-col items-center justify-center gap-[8px] border border-border rounded-lg w-full h-[200px] bg-card transition-opacity duration-300 hover:opacity-50 p-3 md:p-4"
      style={{ backgroundColor: color_code ? `#${color_code}` : undefined }}
    >
      <span className="text-[28px]">{emoji}</span>
      <h3
        className={`${color_code ? "text-black dark:text-black" : "text-foreground"} text-[16px] font-semibold text-center break-words leading-tight min-w-0`}
      >
        {name}
      </h3>

      {/* Общая сумма сразу под названием */}
      <p
        className={`${color_code ? "text-black dark:text-black" : "text-foreground"} text-[18px] font-semibold text-center leading-tight`}
      >
        {formatCurrency(amount, "USD")}
      </p>

      {/* Прогрессбар */}
      <div className="w-full mt-3">
        <BudgetProgressBar
          spentAmount={spentAmount}
          totalAmount={amount}
          type={type}
          spentLabel={tBudgets(
            type === "income" ? "labels.collected" : "labels.spent",
          )}
          leftLabel={tBudgets(
            type === "income" ? "labels.leftToGoal" : "labels.left",
          )}
          accentColorHex={color_code ?? undefined}
          compact
          showLabels={false}
        />
      </div>

      {/* Десктоп: суммы и метки в один ряд */}
      <div
        className={`${color_code ? "text-black dark:text-black" : "text-foreground"} hidden md:grid grid-cols-2 text-xs w-full`}
      >
        <span className="text-left justify-self-start">
          {formatCurrency(spentAmount, "USD")}{" "}
          {tBudgets(type === "income" ? "labels.collected" : "labels.spent")}
        </span>
        <span className="text-right justify-self-end">
          {formatCurrency(Math.max(amount - spentAmount, 0), "USD")}{" "}
          {tBudgets(type === "income" ? "labels.leftToGoal" : "labels.left")}
        </span>
      </div>

      {/* Мобилка: метки сверху */}
      <div
        className={`${color_code ? "text-black dark:text-black" : "text-gray-700 dark:text-white"} grid md:hidden grid-cols-2 text-xs w-full capitalize`}
      >
        <span className="text-left justify-self-start">
          {tBudgets(type === "income" ? "labels.collected" : "labels.spent")}
        </span>
        <span className="text-right justify-self-end">
          {tBudgets(type === "income" ? "labels.leftToGoal" : "labels.left")}
        </span>
      </div>
      {/* Мобилка: суммы снизу */}
      <div
        className={`${color_code ? "text-black dark:text-black" : "text-foreground"} grid md:hidden grid-cols-2 text-xs w-full font-semibold`}
      >
        <span className="text-left justify-self-start">
          {formatCurrency(spentAmount, "USD")}
        </span>
        <span className="text-right justify-self-end">
          {formatCurrency(Math.max(amount - spentAmount, 0), "USD")}
        </span>
      </div>
    </div>
  );
}

export default BudgetFolderItem;
