"use client"

import { CircleCheck, CircleX } from "lucide-react"
import { useToast, ToastProvider } from "./use-toast"

function ToastList() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => {
        const variant = t.variant ?? "default"
        const base = "min-w-[220px] rounded-lg shadow-lg px-4 py-3 flex items-start gap-2"
        const color =
          variant === "success"
            ? "bg-success text-success-foreground"
            : variant === "destructive"
              ? "bg-error text-error-foreground"
              : "bg-primary text-primary-foreground"

        return (
          <div key={t.id} className={`${base} ${color}`} role="alert" aria-live="polite">
            {variant === "success" ? (
              <CircleCheck className="h-5 w-5 shrink-0" />
            ) : variant === "destructive" ? (
              <CircleX className="h-5 w-5 shrink-0" />
            ) : null}
            <div className="flex-1">
              {t.title && <div className="text-sm font-semibold">{t.title}</div>}
              {t.description && <div className="text-sm opacity-90">{t.description}</div>}
            </div>
            <button
              className="ml-2 text-sm underline-offset-2 hover:underline"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            >
              Close
            </button>
          </div>
        )
      })}
    </div>
  )
}

// Встраиваем провайдер внутрь Toaster, чтобы его можно было просто смонтировать один раз
export function Toaster() {
  return (
    <ToastProvider>
      <ToastList />
    </ToastProvider>
  )
}