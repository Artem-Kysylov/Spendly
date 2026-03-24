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

interface BudgetRenewalModalProps {
  isOpen: boolean;
  carryover: number;
  currency: string;
  onRenew: () => Promise<void>;
  onDismiss: () => Promise<void>;
  isRenewing?: boolean;
  isDismissing?: boolean;
}

const BudgetRenewalModal = ({
  isOpen,
  carryover,
  currency,
  onRenew,
  onDismiss,
  isRenewing = false,
  isDismissing = false,
}: BudgetRenewalModalProps) => {
  const tDashboard = useTranslations("dashboard");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent closeOnOverlayClick={false} closeOnEscape={false}>
        <DialogHeader>
          <DialogTitle className="text-center">
            {tDashboard("budgetRenewal.modalTitle")}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-[30px]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 text-center">
              <p className="text-sm text-muted-foreground">
                {tDashboard("budgetRenewal.modalMessage")}
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
                text={tDashboard("budgetRenewal.notYet")}
                variant="ghost"
                className="text-primary flex-1"
                onClick={onDismiss}
                disabled={isRenewing || isDismissing}
                isLoading={isDismissing}
              />
              <Button
                text={tDashboard("budgetRenewal.renewNow")}
                variant="default"
                className="flex-1"
                onClick={onRenew}
                disabled={isRenewing || isDismissing}
                isLoading={isRenewing}
              />
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BudgetRenewalModal;
