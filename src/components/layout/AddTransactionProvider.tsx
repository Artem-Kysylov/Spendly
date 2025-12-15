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

  return isModalOpen ? (
    <TransactionModal
      title={t("modal.addTitle")}
      onClose={closeModal}
      onSubmit={(message, type) => {
        if (type === "success") {
          toast({
            variant: "success",
            description: message,
            duration: 3000,
          });

          window.dispatchEvent(new CustomEvent("budgetTransactionAdded"));
        } else {
          toast({
            variant: "destructive",
            description: message,
            duration: 3000,
          });
        }
      }}
    />
  ) : null;
};

export default AddTransactionProvider;
