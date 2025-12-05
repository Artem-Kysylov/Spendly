"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

type SheetContextValue = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  lastFocusRef: React.MutableRefObject<HTMLElement | null>;
};
const SheetContext = React.createContext<SheetContextValue | null>(null);

export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const lastFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open && lastFocusRef.current) {
      lastFocusRef.current.focus();
    }
  }, [open]);

  return (
    <SheetContext.Provider value={{ open, onOpenChange, lastFocusRef }}>
      {children}
    </SheetContext.Provider>
  );
}

function useSheet() {
  const ctx = React.useContext(SheetContext);
  if (!ctx) throw new Error("Sheet components must be used within <Sheet>");
  return ctx;
}

export function SheetTrigger({ children }: { children: React.ReactElement }) {
  const { onOpenChange, lastFocusRef } = useSheet();
  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      lastFocusRef.current = e.currentTarget as HTMLElement;
      children.props.onClick?.(e);
      onOpenChange?.(true);
    },
    "aria-haspopup": "dialog",
    "aria-expanded": false,
  });
}

export function SheetClose({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { onOpenChange } = useSheet();
  return (
    <button
      type="button"
      className={className}
      onClick={(e) => {
        props.onClick?.(e);
        onOpenChange?.(false);
      }}
    >
      {children}
    </button>
  );
}

// Безопасные пропсы для motion.div: исключаем конфликтные события анимации и drag
type SheetDivProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
>;

export function SheetContent({
  side = "right",
  className,
  children,
  overlayClassName,
  ...rest
}: SheetDivProps & {
  side?: "right" | "left" | "top" | "bottom";
  overlayClassName?: string;
}) {
  const { open, onOpenChange } = useSheet();
  const contentRef = React.useRef<HTMLDivElement>(null);

  if (typeof document === "undefined") return null;

  const sideClasses =
    side === "right"
      ? "inset-y-0 right-0 w-screen sm:w-[480px]"
      : side === "left"
        ? "inset-y-0 left-0 h-screen w-screen sm:h-full sm:w-[480px]"
        : side === "top"
          ? "inset-x-0 top-0 w-screen h-[85vh]"
          : "inset-x-0 bottom-0 w-screen h-[85vh]";

  const enterAnim =
    side === "right"
      ? { x: "100%", opacity: 1 }
      : side === "left"
        ? { x: "-100%", opacity: 1 }
        : side === "top"
          ? { y: "-100%", opacity: 1 }
          : { y: "100%", opacity: 1 };

  const centerAnim = side === "right" || side === "left" ? { x: 0 } : { y: 0 };

  // Focus trap + Escape
  React.useEffect(() => {
    if (!open) return;
    const node = contentRef.current;
    if (!node) return;

    const focusables = () =>
      Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ),
      );

    // Предпочитаем явный элемент с autofocus, если он есть
    const autofocusEl = node.querySelector<HTMLElement>(
      '[autofocus], [data-auto-focus="true"]',
    );
    const el = autofocusEl ?? focusables()[0] ?? node;
    el.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange?.(false);
        e.stopPropagation();
      }
      if (e.key === "Tab") {
        const elements = focusables();
        if (elements.length === 0) return;
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    node.addEventListener("keydown", onKeyDown);
    return () => node.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  // Блокировка фонового скролла при открытой шторке
  React.useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100]"
          role="dialog"
          aria-modal="true"
          onClick={() => onOpenChange?.(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <motion.div
            className={cn(
              "fixed inset-0 bg-foreground/50 dark:bg-black/70 backdrop-blur-[1px] z-0",
              overlayClassName,
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />
          <motion.div
            ref={contentRef}
            tabIndex={-1}
            className={cn(
              "fixed z-10 bg-background text-foreground border border-border shadow-2xl",
              "pt-safe pb-safe sm:pb-0 sm:pt-0",
              "rounded-none sm:rounded-l-xl overflow-hidden",
              sideClasses,
              className,
            )}
            initial={enterAnim}
            animate={centerAnim}
            exit={enterAnim}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 30,
            }}
            onClick={(e) => e.stopPropagation()}
            {...rest}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 border-b border-border bg-background",
        className,
      )}
      {...props}
    />
  );
}
export function SheetTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-sm font-semibold text-foreground", className)}
      {...props}
    />
  );
}
export function SheetDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)} {...props} />
  );
}
export function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-4 py-3 border-t border-border bg-background",
        className,
      )}
      {...props}
    />
  );
}
