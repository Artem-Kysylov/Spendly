import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeBudgetName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD") // Unicode decomposition
    .replace(/[\u0300-\u036f]/g, "") // Strip diacritics
    .replace(/[^\p{L}\p{N}\s-]/gu, "") // Сохраняем любые буквы/цифры/пробелы/дефисы
    .replace(/\s+/g, " ") // Collapse spaces
    .trim();
}