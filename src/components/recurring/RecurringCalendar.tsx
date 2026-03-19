"use client";

import { useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DayButton } from "react-day-picker";
import { cn } from "@/lib/utils";
import { getSubscriptionEmoji } from "@/lib/getSubscriptionEmoji";
import {
  getRecurringPaymentDates,
  getDaysUntilPayment,
} from "@/lib/calculateRecurringDates";
import { formatCurrency } from "@/lib/chartUtils";
import type { Transaction } from "@/types/types";
import { useLocale, useTranslations } from "next-intl";
import useDeviceType from "@/hooks/useDeviceType";
import { enUS, ru, uk, id, ja, ko, hi } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns";

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

  // Custom day button with markers
  const CustomDayButton = ({
    className,
    children,
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
          "flex items-center justify-center rounded-md relative",
          isMobile && "size-(--cell-size) touch-manipulation",
          !isMobile && "size-14 text-sm font-medium tabular-nums leading-none",
          isToday && !isSelected && "rounded-full bg-primary/30 text-primary",
          "data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground",
          "aria-selected:bg-primary aria-selected:text-primary-foreground",
          "data-[selected=true]:rounded-full aria-selected:rounded-full",
          "data-[disabled=true]:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
        {hasPayments && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
        )}
      </DayButton>
    );
  };

  const getDaysText = (days: number): string => {
    if (days === 0) return t("today");
    if (days === 1) return t("tomorrow");
    return t("inDays", { days });
  };

  return (
    <div
      className={cn(
        "w-full",
        variant === "dashboard" ? "mb-4" : "mb-3",
        !isMobile && variant === "dashboard" && "mb-0 flex flex-col flex-1",
      )}
    >
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        {isMobile ? (
          <PopoverAnchor asChild>
            <div className="flex w-full justify-center lg:h-full lg:flex-1 lg:items-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    const dateKey = date.toISOString().split("T")[0];
                    if (paymentDatesMap.has(dateKey)) {
                      setSelectedDate(date);
                      setIsPopoverOpen(true);
                    }
                  }
                }}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                locale={dfLocale}
                showOutsideDays={false}
                captionLayout={"dropdown"}
                buttonVariant={"ghost"}
                hideNav
                className={cn("w-full", "[--cell-size:44px] sm:[--cell-size:56px]")}
                classNames={{
                  week: "flex w-full mt-3 gap-1 sm:gap-2",
                  day: "relative flex-1 h-(--cell-size) p-0 text-center group/day select-none flex items-center justify-center",
                }}
                components={{
                  DayButton: CustomDayButton,
                }}
              />
            </div>
          </PopoverAnchor>
        ) : (
          <PopoverTrigger asChild>
            <div className="flex w-full justify-center lg:h-full lg:flex-1 lg:items-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    const dateKey = date.toISOString().split("T")[0];
                    if (paymentDatesMap.has(dateKey)) {
                      setSelectedDate(date);
                      setIsPopoverOpen(true);
                    }
                  }
                }}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                locale={dfLocale}
                showOutsideDays={false}
                captionLayout={"label"}
                buttonVariant={"ghost"}
                className={cn(
                  "w-full",
                  "[--cell-size:56px] max-w-[560px] mx-auto px-10 py-8",
                )}
                classNames={{
                  root: "w-full flex flex-col",
                  months: "w-full flex flex-col relative",
                  month: "w-full flex flex-col",
                  month_caption:
                    "flex items-center justify-center h-(--cell-size) w-full px-(--cell-size) mb-4",
                  table: "w-full",
                  weekdays: "grid grid-cols-7 w-full mb-4",
                  weekday:
                    "text-muted-foreground font-normal text-[0.75rem] select-none text-center",
                  weeks:
                    "grid grid-cols-7 w-full gap-y-4",
                  week: "contents",
                  day: "relative w-full h-full p-0 text-center group/day select-none flex items-center justify-center",
                }}
                components={{
                  DayButton: CustomDayButton,
                }}
              />
            </div>
          </PopoverTrigger>
        )}
        <PopoverContent
          className="w-auto p-0 bg-card/95 backdrop-blur-md border border-border shadow-lg"
          align="center"
          side="bottom"
          sideOffset={8}
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
                        {transaction.recurrence_day && (
                          <> • {t("monthly")}</>
                        )}
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
    </div>
  );
}
