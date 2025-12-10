// Imports
import { useEffect, useRef } from "react";

// Import types
import { SignOutModalProps } from "../../types/types";

// Import components
import Button from "../ui-elements/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

const SignOutModal = ({ title, text, onClose, signOut }: SignOutModalProps) => {
  const handleSignOut = () => {
    signOut();
    onClose();
  };
  const tCommon = useTranslations("common");
  const tCta = useTranslations("cta");
  return (
    <Dialog
      open={true}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      {/* Убираем захардкоженный светлый фон и серые бордеры */}
      <DialogContent className="border">
        <DialogHeader>
          <DialogTitle className="text-secondary-black dark:text-white">
            {title}
          </DialogTitle>
          <DialogClose className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
            <X size={22} />
          </DialogClose>
        </DialogHeader>
        <p className="py-4 text-secondary-black dark:text-gray-300">{text}</p>
        <DialogFooter className="justify-center sm:justify-center">
          <div className="flex items-center justify-center gap-2">
            <Button
              text={tCommon("cancel")}
              variant="ghost"
              onClick={onClose}
              className="text-primary"
            />
            <Button
              text={tCta("signOut")}
              variant="default"
              onClick={handleSignOut}
            />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SignOutModal;
