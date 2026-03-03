import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isValidAmountInput, parseAmountInput } from "@/lib/utils";
import { UserAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
// Import types
import type { MainBudgetModalProps } from "../../types/types";
// Import components
import Button from "../ui-elements/Button";
import TextInput from "../ui-elements/TextInput";

// Component: TotalBudgetModal
const TotalBudgetModal = ({
  title,
  onClose,
  onSubmit,
}: MainBudgetModalProps) => {
  const { session } = UserAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const tModals = useTranslations("modals");
  const tCommon = useTranslations("common");
  // State
  const [amount, setAmount] = useState<string>("");
  const [budgetResetDay, setBudgetResetDay] = useState<string>("1");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (dialogRef.current) {
      dialogRef.current.showModal();
    }

    // Fetch current budget and budget_reset_day when modal opens
    const fetchCurrentBudget = async () => {
      if (!session?.user?.id) return;

      try {
        console.log("Fetching current budget for user:", session.user.id);

        const [budgetResult, profileResult] = await Promise.all([
          supabase
            .from("main_budget")
            .select("amount")
            .eq("user_id", session.user.id)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("budget_reset_day")
            .eq("id", session.user.id)
            .maybeSingle(),
        ]);

        if (budgetResult.error) {
          console.error("Error fetching budget:", budgetResult.error);
          return;
        }

        console.log("Current budget data:", budgetResult.data);

        if (budgetResult.data) {
          setAmount(budgetResult.data.amount.toString());
        } else {
          console.log("No existing budget found, starting with empty amount");
          setAmount("");
        }

        if (profileResult.data?.budget_reset_day) {
          setBudgetResetDay(profileResult.data.budget_reset_day.toString());
        }
      } catch (error) {
        console.error("Error fetching budget:", error);
      }
    };

    fetchCurrentBudget();

    return () => {
      if (dialogRef.current) {
        dialogRef.current.close();
      }
    };
  }, [session?.user?.id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session?.user)
      return onSubmit("Please login to update budget", "error");
    if (!amount || !isValidAmountInput(amount))
      return onSubmit("Please enter a valid amount", "error");

    const parsedAmount = parseAmountInput(amount);
    const parsedResetDay = Math.min(31, Math.max(1, parseInt(budgetResetDay) || 1));

    try {
      setIsLoading(true);

      console.log("Saving budget:", {
        user_id: session.user.id,
        amount: parsedAmount,
        budget_reset_day: parsedResetDay,
      });

      // Save budget and budget_reset_day in parallel
      const [budgetResult, profileResult] = await Promise.all([
        supabase
          .from("main_budget")
          .upsert(
            {
              user_id: session.user.id,
              amount: parsedAmount,
            },
            { onConflict: "user_id" },
          )
          .select(),
        supabase
          .from("profiles")
          .upsert(
            {
              id: session.user.id,
              budget_reset_day: parsedResetDay,
            },
            { onConflict: "id" },
          ),
      ]);

      if (budgetResult.error) {
        console.error("Error saving budget:", budgetResult.error);
        onSubmit("Failed to save budget. Please try again.", "error");
      } else if (profileResult.error) {
        console.error("Error saving budget reset day:", profileResult.error);
        onSubmit("Budget saved but failed to save reset day.", "error");
      } else {
        console.log("Budget and reset day saved successfully");
        onClose();
        onSubmit("Budget saved successfully!", "success");
      }
    } catch (error) {
      console.error("Error:", error);
      onSubmit("An unexpected error occurred. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // В компоненте TotalBudgetModal (MainBudgetModal)
  return (
    <Dialog
      open={true}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-[30px]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                {tModals("mainBudget.budgetAmount")}
              </label>
              <TextInput
                type="text"
                placeholder={tModals("mainBudget.placeholder.amountUSD")}
                value={amount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || /^\d*[.,]?\d*$/.test(value)) {
                    setAmount(value);
                  }
                }}
                inputMode="decimal"
                min="0"
                step="0.01"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                {tModals("mainBudget.budgetResetDay")}
              </label>
              <TextInput
                type="number"
                placeholder="1"
                value={budgetResetDay}
                onChange={(e) => {
                  const value = e.target.value;
                  const num = parseInt(value);
                  if (value === "" || (num >= 1 && num <= 31)) {
                    setBudgetResetDay(value);
                  }
                }}
                inputMode="numeric"
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                {tModals("mainBudget.resetDayHelper")}
              </p>
            </div>

            <DialogFooter className="flex-row justify-between gap-3">
              <Button
                text={tCommon("cancel")}
                variant="ghost"
                className="text-primary flex-1"
                onClick={onClose}
              />
              <Button
                type="submit"
                text={tCommon("save")}
                variant="default"
                className="flex-1"
                disabled={isLoading || !amount}
                isLoading={isLoading}
              />
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TotalBudgetModal;
