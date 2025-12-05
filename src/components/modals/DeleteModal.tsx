// Imports
import { useEffect, useRef } from "react";

// Import types
import { DeleteModalProps } from "../../types/types";

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

const DeleteModal = ({
  title,
  text,
  onClose,
  onConfirm,
  isLoading = false,
}: DeleteModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (dialogRef.current) {
      dialogRef.current.showModal();
    }
    return () => {
      if (dialogRef.current) {
        dialogRef.current.close();
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm();
  };

  const tCommon = useTranslations("common");

  return (
    <Dialog
      open={true}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogClose className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
            <X size={22} />
          </DialogClose>
        </DialogHeader>
        <p className="py-4">{text}</p>
        <DialogFooter>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Button
              variant="ghost"
              text={tCommon("cancel")}
              onClick={onClose}
              disabled={isLoading}
            />
            <Button
              variant="destructive"
              text={isLoading ? tCommon("deleting") : tCommon("delete")}
              type="submit"
              disabled={isLoading}
            />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteModal;
