import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/chartUtils";
import Button from "../ui-elements/Button";

interface ManualBudgetRenewalModalProps {
  isOpen: boolean;
  carryover: number;
  currency: string;
  onRenew: () => Promise<void>;
  onClose: () => void;
  isRenewing?: boolean;
}

const ManualBudgetRenewalModal = ({
  isOpen,
  carryover,
  currency,
  onRenew,
  onClose,
  isRenewing = false,
}: ManualBudgetRenewalModalProps) => {
  const tDashboard = useTranslations("dashboard");
  const tCommon = useTranslations("common");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">
            {tDashboard("budgetRenewal.manualTitle")}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-[30px]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 text-center">
              <p className="text-sm text-muted-foreground">
                {tDashboard("budgetRenewal.manualMessage")}
              </p>
              {carryover !== 0 && (
                <p className="text-sm font-medium text-foreground">
                  {tDashboard("incomeConfirmation.rolloverBreakdown", {
                    amount: formatCurrency(carryover, currency),
                  })}
                </p>
              )}
            </div>

            <DialogFooter className="flex-row justify-between gap-3">
              <Button
                text={tCommon("cancel")}
                variant="ghost"
                className="text-primary flex-1"
                onClick={onClose}
                disabled={isRenewing}
              />
              <Button
                text={tDashboard("budgetRenewal.renewNow")}
                variant="default"
                className="flex-1"
                onClick={onRenew}
                disabled={isRenewing}
                isLoading={isRenewing}
              />
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualBudgetRenewalModal;
