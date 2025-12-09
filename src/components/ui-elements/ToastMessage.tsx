// Import types
import { ToastMessageProps } from "../../types/types";

// Import components
import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";

const ToastMessage = ({ text, type }: ToastMessageProps) => {
  const { toast } = useToast();
  const firedRef = useRef(false);

  useEffect(() => {
    // Защита от двойного показа в StrictMode и при повторном монтировании
    if (firedRef.current) return;

    const key = "__spendly_last_toast__";
    const now = Date.now();
    const last =
      typeof window !== "undefined"
        ? (window as any)[key]
        : undefined;
    const isDuplicate = last && last.text === text && now - last.ts < 1000;

    if (isDuplicate) return;

    firedRef.current = true;
    if (typeof window !== "undefined") {
      (window as any)[key] = { text, ts: now };
    }

    toast({
      variant: type === "success" ? "success" : "destructive",
      description: text,
      duration: 3000,
    });
  }, [text, type, toast]);

  return null;
};

export default ToastMessage;
