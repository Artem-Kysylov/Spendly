import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { supabase } from "../../lib/supabaseClient";
import { UserAuth } from "../../context/AuthContext";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";

// Import components
import BudgetProgressBar from "../ui-elements/BudgetProgressBar";

// Import types
import { BudgetDetailsProps } from "../../types/types";
// Заменено: используем i18n‑роутер для App Router
import { useRouter } from "@/i18n/routing";

function BudgetDetailsInfo({
  id,
  emoji,
  name,
  amount,
  type,
  color_code,
  rolloverPreviewCarry,
}: BudgetDetailsProps) {
  const { session } = UserAuth();
  const [spentAmount, setSpentAmount] = useState(0);
  const tBudgets = useTranslations("budgets");
  const tN = useTranslations("notifications");
  const router = useRouter();
  const percentage = amount > 0 ? (spentAmount / amount) * 100 : 0;
  const bgColor = color_code ? `#${color_code}` : undefined;

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

      // Суммируем по типу текущего бюджета (expense или income)
      const total =
        data?.reduce((sum, tx) => {
          const matchesType =
            tx.type === (type === "income" ? "income" : "expense");
          return matchesType ? sum + tx.amount : sum;
        }, 0) || 0;

      setSpentAmount(total);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    fetchSpentAmount();

    // Listen for budget transaction updates
    const handleBudgetUpdate = () => {
      fetchSpentAmount();
    };

    window.addEventListener("budgetTransactionAdded", handleBudgetUpdate);

    return () => {
      window.removeEventListener("budgetTransactionAdded", handleBudgetUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session?.user?.id, type]);

  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-[6px] md:gap-[8px] border border-border rounded-lg min-h-[160px] md:min-h-[300px] h-full self-stretch bg-card p-[12px] md:p-[20px] w-full max-w-full overflow-hidden"
      style={{ backgroundColor: bgColor }}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.span
        className="text-[18px] sm:text-[20px] md:text-[25px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
      >
        {emoji}
      </motion.span>
      <motion.h1
        className={`${color_code ? "text-black dark:text-black" : "text-secondary-black dark:text-white"} text-[18px] sm:text-[20px] md:text-[25px] font-semibold break-words text-center`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
      >
        {name}
      </motion.h1>
      <motion.p
        className={`${color_code ? "text-black dark:text-black" : "text-secondary-black dark:text-white"} text-[18px] sm:text-[20px] md:text-[25px] font-semibold break-words text-center`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
      >
        ${amount}
      </motion.p>

      {/* Rollover indicator */}
      {type === "expense" &&
        typeof rolloverPreviewCarry === "number" &&
        rolloverPreviewCarry !== 0 && (
          <motion.div
            className={`mt-2 px-3 py-2 rounded-md text-sm ${rolloverPreviewCarry > 0
              ? "bg-primary/10 text-primary border border-primary/20"
              : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5, ease: "easeOut" }}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="font-medium">
                {tBudgets(
                  rolloverPreviewCarry > 0
                    ? "rollover.positive"
                    : "rollover.negative"
                )}
                :
              </span>
              <span className="font-semibold">
                {rolloverPreviewCarry > 0 ? "+" : ""}$
                {Math.abs(rolloverPreviewCarry).toFixed(2)}
              </span>
            </div>
          </motion.div>
        )}

      {type === "expense" && percentage >= 80 && (
        <div
          className={`mt-3 p-3 rounded border ${percentage >= 100 ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}
        >
          <div className="text-sm font-medium mb-2">
            {percentage >= 100 ? tN("budget_100") : tN("budget_80")}
          </div>
          <button
            onClick={() => {
              // Navigate to AI Assistant with a query param
              router.push(`/ai-assistant?message=Help me save on ${name} budget` as any);
            }}
            className={`w-full flex items-center justify-center gap-2 text-sm px-3 py-2 rounded-md font-medium transition-colors ${percentage >= 100
              ? "bg-red-100 text-red-800 hover:bg-red-200"
              : "bg-amber-100 text-amber-800 hover:bg-amber-200"
              }`}
          >
            <Sparkles className="w-4 h-4" />
            Ask AI how to save
          </button>
        </div>
      )}

      <motion.div
        className="w-full mt-2 md:mt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
      >
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
        />
      </motion.div>
    </motion.div>
  );
}

export default BudgetDetailsInfo;
