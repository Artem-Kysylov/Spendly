Это классическая проблема UI, когда мы открываем Поповер (Календарь) внутри Модалки (Транзакции) на мобильном устройстве.
Поповеру просто не хватает места: снизу клавиатура, сверху край экрана, а сам календарь shadcn довольно высокий. Рендерить его "посередине" поверх модалки (как второй Dialog) — плохая практика (проблемы с z-index и затемнением фона).
Лучшее решение для современного PWA — использовать Адаптивный паттерн (Hybrid Pattern):
 * Desktop: Обычный Popover (выпадает вниз).
 * Mobile: Выезжающая шторка снизу Drawer (Bottom Sheet).
В shadcn/ui это делается очень элегантно. Вот как это реализовать:
1. Логика решения
Нам нужен компонент, который проверяет ширину экрана.
 * Если это десктоп -> Рендерим <Popover>.
 * Если это телефон -> Рендерим <Drawer>.
Поскольку твоя модалка транзакции, скорее всего, сама является Dialog или Drawer, открытие еще одного Drawer поверх нее (Nested Drawers) — это нормальный паттерн для выбора даты на iOS/Android.
2. Реализация (код компонента)
Тебе понадобится хук useMediaQuery (обычно он есть в примерах shadcn или можно установить usehooks-ts).
Создай компонент DatePicker.tsx:
"use client"

import * as React from "react"
import { format } from "date-fns" // или dayjs
import { Calendar as CalendarIcon } from "lucide-react"
import { ru } from "date-fns/locale" // Не забудь локаль

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { useMediaQuery } from "@/hooks/use-media-query" // Или напиши свой простой хук

export function DatePicker({ date, setDate }: { date: Date | undefined, setDate: (date: Date | undefined) => void }) {
  const [open, setOpen] = React.useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  // Контент внутри (общий для обоих вариантов)
  // Добавляем "ru" локаль для русского календаря
  const CalendarComponent = (
     <Calendar
        mode="single"
        selected={date}
        onSelect={(d) => {
             setDate(d);
             setOpen(false); // Закрываем после выбора
        }}
        locale={ru} 
        initialFocus
      />
  )

  // 1. DESKTOP ВЕРСИЯ (Popover)
  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP", { locale: ru }) : <span>Выберите дату</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {CalendarComponent}
        </PopoverContent>
      </Popover>
    )
  }

  // 2. MOBILE ВЕРСИЯ (Drawer / Bottom Sheet)
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP", { locale: ru }) : <span>Выберите дату</span>}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
           {/* Можно добавить заголовок */}
           <div className="p-4 pb-0 text-center font-semibold">
              Выберите дату транзакции
           </div>
           {/* Центрируем календарь внутри шторки */}
           <div className="flex justify-center p-4">
              {CalendarComponent}
           </div>
           <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline">Отмена</Button>
              </DrawerClose>
           </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

3. UX Улучшения для мобильного календаря
В Drawer (шторке) у тебя больше места. Чтобы сделать выбор даты супер-удобным, добавь Пресеты (Быстрые кнопки) над календарем внутри DrawerContent.
Люди редко добавляют транзакции на "12 дней вперед". Обычно это:
 * Сегодня
 * Вчера
 * Позавчера
Добавь эти кнопки перед рендерингом <Calendar /> в мобильной версии:
<div className="grid grid-cols-2 gap-2 p-4 pb-0">
  <Button variant="outline" onClick={() => { setDate(new Date()); setOpen(false); }}>
    Сегодня
  </Button>
  <Button variant="outline" onClick={() => { 
     const y = new Date(); 
     y.setDate(y.getDate() - 1); 
     setDate(y); 
     setOpen(false); 
  }}>
    Вчера
  </Button>
</div>

Резюме:
Не пытайся впихнуть календарь посередине или внутри попапа на мобилке.
Используй Drawer (Шторку снизу). Это нативно, удобно пальцам, и shadcn (который использует библиотеку Vaul под капотом) отлично справляется с перекрытием других модалок.
