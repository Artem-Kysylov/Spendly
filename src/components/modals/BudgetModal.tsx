import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import useDeviceType from "@/hooks/useDeviceType";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";

import { BudgetModalProps } from "../../types/types";
import { useTranslations } from "next-intl";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import BudgetForm from "@/components/budgets/BudgetForm";

const BudgetModal = ({
  title,
  onClose,
  onSubmit,
  isLoading = false,
  initialData,
  handleToastMessage,
}: BudgetModalProps) => {
  const tCommon = useTranslations("common");
  const tModals = useTranslations("modals");

  const { isMobile } = useDeviceType();
  const { mobileSheetsEnabled } = useFeatureFlags();
  const [internalOpen, setInternalOpen] = useState(true);

  const handleClose = () => {
    setInternalOpen(false);
    setTimeout(() => {
      onClose();
    }, 450);
  };

  const handleFormSubmit = async (
    emoji: string,
    name: string,
    amount: number,
    type: "expense" | "income",
    color_code?: string | null,
    rolloverEnabled?: boolean,
    rolloverMode?: "positive-only" | "allow-negative",
    rolloverCap?: number | null,
  ) => {
    try {
      await onSubmit(
        emoji,
        name,
        amount,
        type,
        color_code,
        rolloverEnabled,
        rolloverMode,
        rolloverCap
      );
      handleClose();
    } catch (error) {
      console.error("Error in budget modal:", error);
      if (handleToastMessage) {
        handleToastMessage(tModals("budget.toast.saveFailed"), "error");
      }
    }
  };

  // Mobile Sheet
  if (isMobile && mobileSheetsEnabled) {
    return (
      <Sheet
        open={internalOpen}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <SheetContent
          side="bottom"
          className="fixed h-[95dvh] pb-[env(safe-area-inset-bottom)] overflow-y-auto z-[10000]"
          overlayClassName="bg-foreground/45"
        >
          {/* Drawer handle */}
          <div className="mx-auto mt-2 mb-2 h-1.5 w-12 rounded-full bg-muted" />

          <SheetHeader>
            <SheetTitle className="text-center w-full text-xl font-semibold">
              {title}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 px-4 flex-1 h-full">
            <BudgetForm
              initialData={initialData}
              onSubmit={handleFormSubmit}
              isLoading={isLoading}
              onCancel={handleClose}
            />
          </div>

          <SheetFooter className="mt-4 px-4 pb-6">
            <SheetClose className="h-[50px] md:h-10 px-4 w-full rounded-md border border-input bg-background text-sm text-center flex items-center justify-center">
              {tCommon("close")}
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop Dialog
  return (
    <Dialog
      open={internalOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogClose className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
            <X size={22} />
          </DialogClose>
        </DialogHeader>

        <div className="mt-4">
          <BudgetForm
            initialData={initialData}
            onSubmit={handleFormSubmit}
            isLoading={isLoading}
            onCancel={handleClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BudgetModal;
