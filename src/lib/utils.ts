import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeBudgetName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')                     // декомпозиция юникода
    .replace(/[\u0300-\u036f]/g, '')       // удаление диакритики
    .replace(/[^a-z0-9\s-]/g, '')          // только буквы/цифры/пробелы/дефисы
    .replace(/\s+/g, ' ')                  // схлопываем пробелы
    .trim()
}
