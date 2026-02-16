import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import BudgetForm from "@/components/budgets/BudgetForm";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import useDeviceType from "@/hooks/useDeviceType";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import type { BudgetModalProps } from "../../types/types";

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
        rolloverCap,
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
          <div className="flex flex-col h-full">
            {/* Drawer handle */}
            <div className="mx-auto mt-2 mb-2 h-1.5 w-12 rounded-full bg-muted" />

            <SheetHeader>
              <div className="flex items-center justify-between gap-2 w-full">
                <div className="w-10" />
                <SheetTitle className="text-center text-xl font-semibold flex-1">
                  {title}
                </SheetTitle>
                <div className="w-10" />
              </div>
            </SheetHeader>

            <div className="mt-4 px-4 flex-1">
              <BudgetForm
                initialData={initialData}
                onSubmit={handleFormSubmit}
                isLoading={isLoading}
                onCancel={handleClose}
              />
            </div>

            <SheetFooter className="mt-4 px-4 pb-4">
              <SheetClose className="h-[50px] md:h-10 px-4 w-full rounded-md border border-input bg-background text-sm text-center flex items-center justify-center">
                {tCommon("close")}
              </SheetClose>
            </SheetFooter>
          </div>
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
          <div className="flex items-center justify-between gap-2">
            <div className="w-10" />
            <DialogTitle className="text-center flex-1">{title}</DialogTitle>
            <DialogClose className="inline-flex items-center justify-center h-10 w-10 text-muted-foreground md:hover:text-foreground">
              <X size={22} />
            </DialogClose>
          </div>
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
