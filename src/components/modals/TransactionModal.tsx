import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import useDeviceType from "@/hooks/useDeviceType";
import { X } from "lucide-react";

import type { TransactionModalProps } from "@/types/types";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import TransactionForm from "@/components/transactions/TransactionForm";

function TransactionModal({
  title,
  onClose,
  onSubmit,
  initialBudgetId,
  initialData,
  allowTypeChange = true,
}: TransactionModalProps) {
  const tCommon = useTranslations("common");
  const { isMobile } = useDeviceType();
  const { mobileSheetsEnabled } = useFeatureFlags();
  const [internalOpen, setInternalOpen] = useState(true);

  const handleClose = () => {
    setInternalOpen(false);
    setTimeout(() => {
      onClose();
    }, 450); // Wait for animation
  };

  const handleSuccess = () => {
    // The form handles the actual submission and toast
    // We just need to close the modal
    handleClose();
    // Trigger any parent callbacks if needed, though the form handles router.refresh()
    // We can pass a success message to the parent if it expects one
    onSubmit("Transaction added successfully!", "success");
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
          className="transaction-modal fixed h-[95dvh] pb-[env(safe-area-inset-bottom)] overflow-y-auto z-[10000]"
          overlayClassName="bg-foreground/45"
        >
          <div className="flex flex-col h-full">
            {/* Drawer handle */}
            <div className="mx-auto mt-2 mb-2 h-1.5 w-12 rounded-full bg-muted" />
            <SheetHeader>
              <SheetTitle className="text-center text-xl font-semibold w-full">
                {title} 📉
              </SheetTitle>
            </SheetHeader>

            <div className="mt-[10px] px-4 flex-1">
              <TransactionForm
                initialData={initialData}
                initialBudgetId={initialBudgetId}
                onSuccess={handleSuccess}
                onCancel={handleClose}
                allowTypeChange={allowTypeChange}
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
      <DialogContent className="transaction-modal sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogClose className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
            <X size={22} />
          </DialogClose>
        </DialogHeader>

        <div className="mt-[20px]">
          <TransactionForm
            initialData={initialData}
            initialBudgetId={initialBudgetId}
            onSuccess={handleSuccess}
            onCancel={handleClose}
            allowTypeChange={allowTypeChange}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TransactionModal;
