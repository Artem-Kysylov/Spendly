import type { Transaction } from "@/types/types";

/**
 * Calculates the payment date for a recurring transaction in a given month
 * @param recurrenceDay - Day of month (1-31) when payment occurs
 * @param month - Month (0-11, JavaScript Date format)
 * @param year - Year
 * @returns Date object for the payment, or null if invalid
 */
export function getPaymentDateForMonth(
  recurrenceDay: number,
  month: number,
  year: number,
): Date | null {
  if (!recurrenceDay || recurrenceDay < 1 || recurrenceDay > 31) {
    return null;
  }

  // Get the last day of the target month
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

  // If recurrence day is beyond the month's last day, use the last day
  const actualDay = Math.min(recurrenceDay, lastDayOfMonth);

  return new Date(year, month, actualDay);
}

/**
 * Gets all recurring payment dates for a given month
 * @param transactions - Array of recurring transactions
 * @param month - Month (0-11, JavaScript Date format)
 * @param year - Year
 * @returns Map of date strings to arrays of transactions
 */
export function getRecurringPaymentDates(
  transactions: Transaction[],
  month: number,
  year: number,
): Map<string, Transaction[]> {
  const dateMap = new Map<string, Transaction[]>();

  for (const transaction of transactions) {
    if (!transaction.is_recurring || !transaction.recurrence_day) {
      continue;
    }

    const paymentDate = getPaymentDateForMonth(
      transaction.recurrence_day,
      month,
      year,
    );

    if (!paymentDate) {
      continue;
    }

    // Create date key in YYYY-MM-DD format
    const dateKey = paymentDate.toISOString().split("T")[0];

    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, []);
    }

    dateMap.get(dateKey)!.push(transaction);
  }

  return dateMap;
}

/**
 * Calculates days until a payment date
 * @param paymentDate - The payment date
 * @returns Number of days (0 for today, negative for past)
 */
export function getDaysUntilPayment(paymentDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const payment = new Date(paymentDate);
  payment.setHours(0, 0, 0, 0);

  const diffTime = payment.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
