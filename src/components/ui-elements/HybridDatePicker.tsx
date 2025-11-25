'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { enUS, ru, uk, id, ja, ko, hi } from 'date-fns/locale'
import type { Locale as DateFnsLocale } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from '@/components/ui/popover'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from '@/components/ui/sheet'
import Button from './Button'
import CalendarQuickPresets from './CalendarQuickPresets'
import { cn } from '@/lib/utils'
import useDeviceType from '@/hooks/useDeviceType'
import { useLocale } from 'next-intl'
import { DayButton } from 'react-day-picker'

interface HybridDatePickerProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  label?: string
  placeholder?: string
  disabled?: (date: Date) => boolean
  className?: string
}

function MobileDayButton({ className, children, ...props }: React.ComponentProps<typeof DayButton>) {
  return (
    <DayButton
      className={cn(
        "flex size-(--cell-size) w-full h-full items-center justify-center rounded-md m-2",
        "data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground",
        "aria-selected:bg-primary aria-selected:text-primary-foreground",
        "data-[disabled=true]:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </DayButton>
  )
}

export default function HybridDatePicker({
  selectedDate,
  onDateSelect,
  label = 'Pick up the date',
  placeholder = 'Pick a date',
  disabled,
  className,
}: HybridDatePickerProps) {
  const { isMobile } = useDeviceType()
  const localeCode = useLocale()
  const dfLocaleMap: Record<string, DateFnsLocale> = {
    en: enUS, 'en-US': enUS,
    ru, 'ru-RU': ru,
    uk, 'uk-UA': uk,
    id, 'id-ID': id,
    ja, 'ja-JP': ja,
    ko, 'ko-KR': ko,
    hi, 'hi-IN': hi,
  }
  const dfLocale = dfLocaleMap[localeCode] ?? enUS

  const normalizedDisabled = useMemo(() => {
    return disabled ?? ((date: Date) => date > new Date() || date < new Date('1900-01-01'))
  }, [disabled])

  const [openDesktop, setOpenDesktop] = useState(false)
  const [openMobile, setOpenMobile] = useState(false)

  const buttonElMobile = (
    <Button
      variant="outline"
      className={cn('w-full justify-start text-left font-normal', !selectedDate && 'text-muted-foreground')}
      text={selectedDate ? format(selectedDate, 'PPP', { locale: dfLocale }) : placeholder}
      icon={<CalendarIcon className="mr-2 h-4 w-4" />}
      onClick={() => setOpenMobile(true)}
    />
  )

  const buttonElDesktop = (
    <Button
      variant="outline"
      className={cn('w-full justify-start text-left font-normal', !selectedDate && 'text-muted-foreground')}
      text={selectedDate ? format(selectedDate, 'PPP', { locale: dfLocale }) : placeholder}
      icon={<CalendarIcon className="mr-2 h-4 w-4" />}
    />
  )

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label className="text-sm font-medium text-secondary-black dark:text-white">{label}</label>
      )}

      {isMobile ? (
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetTrigger>{buttonElMobile}</SheetTrigger>
          <SheetContent side="bottom" className="bg-background text-foreground h-[70vh]">
            <SheetHeader className="px-4 py-4 border-b border-border justify-center">
              <SheetTitle className="text-[18px] sm:text-[20px] font-semibold text-center">
                Choose date
              </SheetTitle>
            </SheetHeader>

            <div className="p-4 space-y-4">
              <CalendarQuickPresets
                onSelect={(date) => {
                  onDateSelect(date)
                  setOpenMobile(false)
                }}
              />
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    if (d) {
                      onDateSelect(d)
                      setOpenMobile(false)
                    }
                  }}
                  disabled={normalizedDisabled}
                  initialFocus
                  showOutsideDays={false}
                  captionLayout="dropdown"
                  buttonVariant="ghost"
                  hideNav
                  className="[--cell-size:56px]"
                  classNames={{ week: "flex w-full mt-3 gap-4" }}
                  components={{ DayButton: MobileDayButton }}
                  locale={dfLocale}
                />
              </div>
            </div>

            <SheetFooter className="px-4 py-3 border-t border-border">
              <SheetClose className="h-10 px-4 w-full rounded-md border border-input bg-background text-sm text-center">
                Cancel
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <div className="w-full">
          <Popover open={openDesktop} onOpenChange={setOpenDesktop}>
            <PopoverTrigger asChild>{buttonElDesktop}</PopoverTrigger>
            {/* Якорь для центрирования по правому краю модалки */}
            <PopoverAnchor asChild>
              <div className="absolute inset-y-0 left-full w-0 pointer-events-none" />
            </PopoverAnchor>
            {/* Убираем фикс. ширину и внешнюю паддингу — отступы слева/справа становятся равными */}
            <PopoverContent className="w-auto p-0" align="center" side="right" sideOffset={16}>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => {
                  if (d) {
                    onDateSelect(d)
                    setOpenDesktop(false)
                  }
                }}
                disabled={normalizedDisabled}
                initialFocus
                showOutsideDays={false}
                captionLayout="dropdown"
                buttonVariant="ghost"
                hideNav
                locale={dfLocale}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  )
}