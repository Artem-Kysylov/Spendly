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
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (dialogRef.current) {
      dialogRef.current.showModal();
    }

    // Fetch current budget when modal opens
    const fetchCurrentBudget = async () => {
      if (!session?.user?.id) return;

      try {
        console.log("Fetching current budget for user:", session.user.id);

        const { data, error } = await supabase
          .from("main_budget")
          .select("amount")
          .eq("user_id", session.user.id)
          .maybeSingle(); // Используем maybeSingle вместо single

        if (error) {
          console.error("Error fetching budget:", error);
          return;
        }

        console.log("Current budget data:", data);

        if (data) {
          setAmount(data.amount.toString());
        } else {
          console.log("No existing budget found, starting with empty amount");
          setAmount("");
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

    try {
      setIsLoading(true);

      console.log("Saving budget:", {
        user_id: session.user.id,
        amount: parsedAmount,
      });

      // Используем upsert для создания или обновления записи
      const { data, error } = await supabase
        .from("main_budget")
        .upsert(
          {
            user_id: session.user.id,
            amount: parsedAmount,
          },
          { onConflict: "user_id" },
        )
        .select();

      if (error) {
        console.error("Error saving budget:", error);
        onSubmit("Failed to save budget. Please try again.", "error");
      } else {
        console.log("Budget saved successfully:", data);
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
          <DialogClose className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
            <X size={22} />
          </DialogClose>
        </DialogHeader>
        <div className="mt-[30px]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
