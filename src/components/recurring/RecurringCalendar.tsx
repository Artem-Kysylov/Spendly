"use client";

import type { Locale as DateFnsLocale } from "date-fns";
import { enUS, hi, id, ja, ko, ru, uk } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { DayButton } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import useDeviceType from "@/hooks/useDeviceType";
import {
  getDaysUntilPayment,
  getRecurringPaymentDates,
} from "@/lib/calculateRecurringDates";
import { formatCurrency } from "@/lib/chartUtils";
import { getSubscriptionEmoji } from "@/lib/getSubscriptionEmoji";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/types";

interface RecurringCalendarProps {
  transactions: Transaction[];
  variant?: "dashboard" | "settings";
  currency: string;
}

export default function RecurringCalendar({
  transactions,
  variant = "dashboard",
  currency,
}: RecurringCalendarProps) {
  const t = useTranslations("recurring.calendar");
  const localeCode = useLocale();
  const { isMobile } = useDeviceType();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingOpenDateRef = useRef<Date | null>(null);
  const reopenFrameRef = useRef<number | null>(null);

  const dfLocaleMap: Record<string, DateFnsLocale> = {
    en: enUS,
    "en-US": enUS,
    ru,
    "ru-RU": ru,
    uk,
    "uk-UA": uk,
    id,
    "id-ID": id,
    ja,
    "ja-JP": ja,
    ko,
    "ko-KR": ko,
    hi,
    "hi-IN": hi,
  };
  const dfLocale = dfLocaleMap[localeCode] ?? enUS;

  useEffect(() => {
    return () => {
      if (reopenFrameRef.current !== null) {
        cancelAnimationFrame(reopenFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isPopoverOpen || !pendingOpenDateRef.current) {
      return;
    }

    const nextDate = pendingOpenDateRef.current;
    pendingOpenDateRef.current = null;

    reopenFrameRef.current = requestAnimationFrame(() => {
      setSelectedDate(nextDate);
      setIsPopoverOpen(true);
      reopenFrameRef.current = null;
    });
  }, [isPopoverOpen]);

  // Calculate payment dates for current month
  const paymentDatesMap = useMemo(() => {
    const month = currentMonth.getMonth();
    const year = currentMonth.getFullYear();
    return getRecurringPaymentDates(transactions, month, year);
  }, [transactions, currentMonth]);

  // Get transactions for selected date
  const selectedDateTransactions = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = selectedDate.toISOString().split("T")[0];
    return paymentDatesMap.get(dateKey) || [];
  }, [selectedDate, paymentDatesMap]);

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const openForDate = (date: Date) => {
    clearCloseTimeout();
    pendingOpenDateRef.current = null;
    if (reopenFrameRef.current !== null) {
      cancelAnimationFrame(reopenFrameRef.current);
      reopenFrameRef.current = null;
    }
    setSelectedDate(date);
    setIsPopoverOpen(true);
  };

  const closePopover = () => {
    clearCloseTimeout();
    pendingOpenDateRef.current = null;
    if (reopenFrameRef.current !== null) {
      cancelAnimationFrame(reopenFrameRef.current);
      reopenFrameRef.current = null;
    }
    setIsPopoverOpen(false);
  };

  const scheduleClose = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setIsPopoverOpen(false);
    }, 120);
  };

  // Custom day button with markers
  const CustomDayButton = ({
    className,
    children,
    onMouseEnter,
    onMouseLeave,
    ...props
  }: React.ComponentProps<typeof DayButton>) => {
    const day = props.day?.date;
    const hasPayments = day
      ? paymentDatesMap.has(day.toISOString().split("T")[0])
      : false;

    const isToday = !!props.modifiers?.today;
    const isSelected = !!props.modifiers?.selected;

    return (
      <DayButton
        className={cn(
          "relative flex items-center justify-center rounded-md",
          isMobile && "h-full w-full rounded-[1.125rem] p-0",
          !isMobile && "size-14 text-sm font-medium tabular-nums leading-none",
          !isMobile &&
            isToday &&
            !isSelected &&
            "rounded-full bg-primary/30 text-primary",
          !isMobile &&
            "data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground",
          !isMobile &&
            "aria-selected:bg-primary aria-selected:text-primary-foreground",
          !isMobile &&
            "data-[selected=true]:rounded-full aria-selected:rounded-full",
          "data-[disabled=true]:opacity-50",
          className,
        )}
        {...props}
        onMouseEnter={(event) => {
          onMouseEnter?.(event);
          if (!isMobile && day && hasPayments) {
            openForDate(day);
          }
        }}
        onMouseLeave={(event) => {
          onMouseLeave?.(event);
          if (!isMobile && hasPayments) {
            scheduleClose();
          }
        }}
      >
        {isMobile ? (
          <div className="pointer-events-none relative flex h-full w-full flex-col items-center justify-center">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-xs font-medium tabular-nums leading-none transition-colors",
                isSelected && "bg-primary text-primary-foreground",
                !isSelected && isToday && "bg-primary/12 text-primary",
                !isSelected && !isToday && "text-foreground",
              )}
            >
              {children}
            </span>
            {hasPayments && (
              <span
                className={cn(
                  "absolute left-1/2 top-1/2 mt-3.5 size-1.5 -translate-x-1/2 rounded-full",
                  isSelected ? "bg-primary-foreground" : "bg-primary",
                )}
              />
            )}
          </div>
        ) : (
          <>
            {children}
            {hasPayments && (
              <div className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary" />
            )}
          </>
        )}
      </DayButton>
    );
  };

  const getDaysText = (days: number): string => {
    if (days === 0) return t("today");
    if (days === 1) return t("tomorrow");
    if (days === -1) return t("yesterday");
    if (days < 0) return t("daysAgo", { days: Math.abs(days) });
    return t("inDays", { days });
  };

  return (
    <fieldset
      className={cn(
        "w-full",
        variant === "dashboard" ? "mb-4" : "mb-3",
        !isMobile && variant === "dashboard" && "mb-0 flex flex-col flex-1",
      )}
      onMouseEnter={() => {
        if (!isMobile) {
          clearCloseTimeout();
        }
      }}
      onMouseLeave={() => {
        if (!isMobile) {
          scheduleClose();
        }
      }}
    >
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverAnchor asChild>
          <div className="flex w-full justify-center lg:h-full lg:flex-1 lg:items-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date && isMobile) {
                  const dateKey = date.toISOString().split("T")[0];
                  if (paymentDatesMap.has(dateKey)) {
                    const selectedDateKey = selectedDate
                      ?.toISOString()
                      .split("T")[0];

                    if (
                      isPopoverOpen &&
                      selectedDateKey &&
                      selectedDateKey !== dateKey
                    ) {
                      pendingOpenDateRef.current = date;
                      if (reopenFrameRef.current !== null) {
                        cancelAnimationFrame(reopenFrameRef.current);
                        reopenFrameRef.current = null;
                      }
                      setSelectedDate(date);
                      setIsPopoverOpen(false);
                      return;
                    }

                    openForDate(date);
                    return;
                  }
                  closePopover();
                  setSelectedDate(undefined);
                }
              }}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={dfLocale}
              showOutsideDays={false}
              captionLayout={isMobile ? "dropdown" : "label"}
              buttonVariant={isMobile ? "ghost" : "ghost"}
              hideNav={isMobile}
              className={cn(
                "w-full",
                isMobile
                  ? "[--cell-size:42px] px-0 py-1"
                  : "[--cell-size:56px] max-w-[560px] mx-auto px-10 py-8",
              )}
              classNames={
                isMobile
                  ? {
                      root: "w-full",
                      months: "w-full flex flex-col",
                      month: "w-full flex flex-col gap-3",
                      month_caption:
                        "flex items-center justify-center h-10 w-full mb-1",
                      dropdowns:
                        "flex h-10 w-full items-center justify-center gap-1.5 text-sm font-medium",
                      table: "w-full border-separate border-spacing-y-1.5",
                      weekdays: "grid grid-cols-7 w-full gap-1 px-1",
                      weekday:
                        "text-muted-foreground text-[0.7rem] font-medium select-none text-center",
                      weeks: "grid w-full gap-y-1.5",
                      week: "flex w-full gap-1.5",
                      day: "relative aspect-square min-h-[2.75rem] flex-1 p-0 text-center group/day select-none",
                    }
                  : {
                      root: "w-full flex flex-col",
                      months: "w-full flex flex-col relative",
                      month: "w-full flex flex-col",
                      month_caption:
                        "flex items-center justify-center h-(--cell-size) w-full px-(--cell-size) mb-4",
                      table: "w-full",
                      weekdays: "grid grid-cols-7 w-full mb-4",
                      weekday:
                        "text-muted-foreground font-normal text-[0.75rem] select-none text-center",
                      weeks: "grid grid-cols-7 w-full gap-y-4",
                      week: "contents",
                      day: "relative w-full h-full p-0 text-center group/day select-none flex items-center justify-center",
                    }
              }
              components={{
                DayButton: CustomDayButton,
              }}
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="w-auto p-0 bg-card/95 backdrop-blur-md border border-border shadow-lg"
          align="center"
          side="bottom"
          sideOffset={8}
          onMouseEnter={() => {
            if (!isMobile) {
              clearCloseTimeout();
            }
          }}
          onMouseLeave={() => {
            if (!isMobile) {
              scheduleClose();
            }
          }}
        >
          {selectedDateTransactions.length > 0 ? (
            <div className="p-4 space-y-3 max-w-[280px]">
              {selectedDateTransactions.map((transaction) => {
                const emoji = getSubscriptionEmoji(transaction.title);
                const daysUntil = selectedDate
                  ? getDaysUntilPayment(selectedDate)
                  : 0;

                return (
                  <div
                    key={transaction.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50"
                  >
                    <div className="text-2xl flex-shrink-0">{emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">
                        {transaction.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatCurrency(transaction.amount, currency)}
                        {transaction.recurrence_day && <> • {t("monthly")}</>}
                      </div>
                      <div className="text-xs text-primary font-medium mt-1">
                        {getDaysText(daysUntil)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-sm text-muted-foreground text-center">
              {t("noPayments")}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </fieldset>
  );
}
