// AddTransactionProvider component
"use client";

import React, { useEffect } from "react";
import useModal from "@/hooks/useModal";
import TransactionModal from "@/components/modals/TransactionModal";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/use-toast";

const AddTransactionProvider: React.FC = () => {
  const { isModalOpen, openModal, closeModal } = useModal();
  const t = useTranslations("transactions");
  const { toast } = useToast();

  useEffect(() => {
    const handler = () => openModal();
    window.addEventListener("transactions:add", handler);
    return () => window.removeEventListener("transactions:add", handler);
  }, [openModal]);

  const handleSubmit = (message: string, type: "success" | "error") => {
    if (type === "success") {
      toast({
        variant: "success",
        description: message,
        duration: 3000,
      });

      window.dispatchEvent(new CustomEvent("budgetTransactionAdded"));

      // Smart PWA Install Trigger: After dopamine moment (transaction success)
      // Wait 1.5s to let the success toast show, then trigger install prompt
      setTimeout(() => {
        // Check if app is NOT in standalone mode
        const isStandalone =
          window.matchMedia("(display-mode: standalone)").matches ||
          (window.navigator as any).standalone === true;

        if (!isStandalone) {
          // Dispatch the PWA install trigger event
          // The InstallPWA component will handle checking if prompt was already seen
          window.dispatchEvent(new CustomEvent("pwa:trigger-install"));
        }
      }, 1500);
    } else {
      toast({
        variant: "destructive",
        description: message,
        duration: 3000,
      });
    }
  };

  return isModalOpen ? (
    <TransactionModal
      title={t("modal.addTitle")}
      onClose={closeModal}
      onSubmit={handleSubmit}
    />
  ) : null;
};

export default AddTransactionProvider;
