import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import Button from "./Button";
import { useLocale } from "next-intl";
import { enUS, ru, uk, id, ja, ko, hi } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns";

interface CustomDatePickerProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  label?: string;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  className?: string;
}

const MAX_POPOVER_WIDTH = 360;
const POPOVER_HEIGHT = 340;

const CustomDatePicker = ({
  selectedDate,
  onDateSelect,
  label = "Pick up the date",
  placeholder = "Pick a date",
  disabled,
  className,
}: CustomDatePickerProps) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(
    selectedDate || new Date(),
  );
  const triggerRef = useRef<HTMLDivElement>(null);
  const [portalCoords, setPortalCoords] = useState<{
    top: number;
    left: number;
    width: number;
  }>({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const insideTrigger = !!target.closest(".calendar-container");
      const insidePopover = !!target.closest(".custom-date-picker-popover");
      if (isDatePickerOpen && !insideTrigger && !insidePopover) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDatePickerOpen]);

  useEffect(() => {
    if (!isDatePickerOpen) return;
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        const isDesktop = window.innerWidth >= 1024;
        if (isDesktop) {
          const modalEl = document.querySelector(
            ".transaction-modal",
          ) as HTMLElement | null;
          const m = modalEl?.getBoundingClientRect();
          if (m) {
            const left = Math.min(
              window.innerWidth - 8 - MAX_POPOVER_WIDTH,
              Math.max(8, m.right + 16),
            );
            const top = Math.max(
              8,
              Math.min(
                window.innerHeight - 8 - POPOVER_HEIGHT,
                Math.round(m.top + m.height / 2 - POPOVER_HEIGHT / 2),
              ),
            );
            setPortalCoords({ top, left, width: MAX_POPOVER_WIDTH });
            return;
          }
        }
        const preferRight = rect.right + 8;
        const preferLeft = rect.left - 8 - MAX_POPOVER_WIDTH;
        const fitsRight =
          preferRight + MAX_POPOVER_WIDTH <= window.innerWidth - 8;
        const left = fitsRight ? preferRight : Math.max(8, preferLeft);
        const top = Math.min(Math.max(8, rect.top), window.innerHeight - 8);
        setPortalCoords({ top, left, width: MAX_POPOVER_WIDTH });
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isDatePickerOpen]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onDateSelect(date);
      setIsDatePickerOpen(false);
    }
  };

  const localeCode = useLocale();
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

  return (
    <div className={cn("flex flex-col gap-2 relative", className)}>
      {label && (
        <label className="text-sm font-medium text-secondary-black dark:text-white">
          {label}
        </label>
      )}
      <div className="relative calendar-container" ref={triggerRef}>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
          )}
          text={
            selectedDate
              ? format(selectedDate, "PPP", { locale: dfLocale })
              : placeholder
          }
          icon={<CalendarIcon className="mr-2 h-4 w-4" />}
          onClick={() => {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (rect) {
              const isDesktop = window.innerWidth >= 1024;
              if (isDesktop) {
                const modalEl = document.querySelector(
                  ".transaction-modal",
                ) as HTMLElement | null;
                const m = modalEl?.getBoundingClientRect();
                if (m) {
                  const left = Math.min(
                    window.innerWidth - 8 - MAX_POPOVER_WIDTH,
                    Math.max(8, m.right + 16),
                  );
                  const top = Math.max(
                    8,
                    Math.min(
                      window.innerHeight - 8 - POPOVER_HEIGHT,
                      Math.round(m.top + m.height / 2 - POPOVER_HEIGHT / 2),
                    ),
                  );
                  setPortalCoords({ top, left, width: MAX_POPOVER_WIDTH });
                } else {
                  const preferRight = rect.right + 8;
                  const preferLeft = rect.left - 8 - MAX_POPOVER_WIDTH;
                  const fitsRight =
                    preferRight + MAX_POPOVER_WIDTH <= window.innerWidth - 8;
                  const left = fitsRight
                    ? preferRight
                    : Math.max(8, preferLeft);
                  const top = Math.min(
                    Math.max(8, rect.top),
                    window.innerHeight - 8,
                  );
                  setPortalCoords({ top, left, width: MAX_POPOVER_WIDTH });
                }
              } else {
                const preferRight = rect.right + 8;
                const preferLeft = rect.left - 8 - MAX_POPOVER_WIDTH;
                const fitsRight =
                  preferRight + MAX_POPOVER_WIDTH <= window.innerWidth - 8;
                const left = fitsRight ? preferRight : Math.max(8, preferLeft);
                const top = Math.min(
                  Math.max(8, rect.top),
                  window.innerHeight - 8,
                );
                setPortalCoords({ top, left, width: MAX_POPOVER_WIDTH });
              }
            }
            setIsDatePickerOpen(!isDatePickerOpen);
          }}
        />
        {/* Portal popover to avoid modal scroll and stacking issues */}
        {isDatePickerOpen &&
          createPortal(
            <div
              className="custom-date-picker-popover p-4 bg-white dark:bg-card rounded-lg shadow-lg border border-border dark:border-border z-[10000]"
              style={{
                position: "fixed",
                top: portalCoords.top,
                left: portalCoords.left,
                width: portalCoords.width,
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <button
                  type="button"
                  onClick={() => {
                    const newMonth = new Date(currentMonth);
                    newMonth.setMonth(newMonth.getMonth() - 1);
                    setCurrentMonth(newMonth);
                  }}
                  className="h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all duration-200 flex items-center justify-center"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {format(currentMonth, "MMMM yyyy", { locale: dfLocale })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newMonth = new Date(currentMonth);
                    newMonth.setMonth(newMonth.getMonth() + 1);
                    setCurrentMonth(newMonth);
                  }}
                  className="h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all duration-200 flex items-center justify-center"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    onDateSelect(date);
                    setIsDatePickerOpen(false);
                  }
                }}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                disabled={
                  disabled ||
                  ((date: Date) =>
                    date > new Date() || date < new Date("1900-01-01"))
                }
                initialFocus
                showOutsideDays={false}
                className="w-fit"
                locale={dfLocale}
                classNames={{
                  months:
                    "flex w-full flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4 w-full",
                  caption: "hidden",
                  nav: "hidden",
                  caption_label: "hidden",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex w-full",
                  head_cell:
                    "text-gray-500 dark:text-gray-400 rounded-md w-9 font-normal text-[0.8rem] text-center",
                  row: "flex w-full mt-2",
                  cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                  day: "h-9 w-9 p-0 font-normal hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex items-center justify-center border-0 outline-none focus:outline-none text-gray-900 dark:text-white",
                  day_selected:
                    "bg-blue-600 text-white hover:bg-blue-700 focus:bg-blue-700 focus:outline-none",
                  day_today:
                    "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold",
                  day_outside: "text-gray-400 opacity-50",
                  day_disabled:
                    "text-gray-300 dark:text-gray-600 opacity-50 cursor-not-allowed",
                  day_hidden: "invisible",
                }}
              />
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
};

export default CustomDatePicker;
