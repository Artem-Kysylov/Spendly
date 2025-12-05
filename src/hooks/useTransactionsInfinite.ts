import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { UserAuth } from "@/context/AuthContext";
import { Transaction } from "@/types/types";
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  format,
  isToday,
  isYesterday,
} from "date-fns";

const ITEMS_PER_PAGE = 20;

export type TransactionFilterType = "all" | "expense" | "income";

interface UseTransactionsInfiniteProps {
  initialType?: TransactionFilterType;
}

export const useTransactionsInfinite = ({
  initialType = "all",
}: UseTransactionsInfiniteProps = {}) => {
  const { session } = UserAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] =
    useState<TransactionFilterType>(initialType);

  // Pagination state
  const [page, setPage] = useState(0);

  // Stats state
  const [stats, setStats] = useState({
    totalSpent: 0,
    dailyAverage: 0,
  });

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset list when filters change
  useEffect(() => {
    setPage(0);
    setTransactions([]);
    setHasNextPage(true);
    // We will trigger fetch in the next effect
  }, [debouncedSearch, filterType]);

  const fetchTransactions = useCallback(
    async (pageIndex: number, isNew: boolean) => {
      if (!session?.user?.id) return;

      try {
        if (isNew) setIsLoading(true);
        else setIsFetchingNextPage(true);

        let query = supabase
          .from("transactions")
          .select(`
          *,
          budget_folders (
            emoji,
            name
          )
        `)
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        // Apply filters
        if (filterType !== "all") {
          query = query.eq("type", filterType);
        }

        if (debouncedSearch) {
          query = query.ilike("title", `%${debouncedSearch}%`);
        }

        // Pagination
        const from = pageIndex * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        query = query.range(from, to);

        const { data, error } = await query;

        if (error) throw error;

        const transformedData =
          data?.map((transaction) => ({
            ...transaction,
            category_emoji: transaction.budget_folders?.emoji || null,
            category_name: transaction.budget_folders?.name || null,
          })) || [];

        if (transformedData.length < ITEMS_PER_PAGE) {
          setHasNextPage(false);
        }

        setTransactions((prev) =>
          isNew ? transformedData : [...prev, ...transformedData],
        );
      } catch (err) {
        console.error("Error fetching transactions:", err);
      } finally {
        setIsLoading(false);
        setIsFetchingNextPage(false);
      }
    },
    [session?.user?.id, filterType, debouncedSearch],
  );

  // Fetch stats (separate query to get totals for the current filter context)
  const fetchStats = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      let query = supabase
        .from("transactions")
        .select("amount, type, created_at")
        .eq("user_id", session.user.id)
        .eq("type", "expense"); // Stats usually focus on spending

      // Apply search filter to stats too?
      // Usually stats are for the "view", so if I search "Uber", stats should reflect "Uber" spending.
      if (debouncedSearch) {
        query = query.ilike("title", `%${debouncedSearch}%`);
      }

      // Note: filterType might be 'income', in which case 'total spent' might be 0 or irrelevant.
      // But the requirement says "Total Spent". If I filter by Income, maybe show Total Income?
      // For now, let's stick to Expenses for "Total Spent" unless the user explicitly filters for Income.

      if (filterType === "income") {
        // If viewing income, maybe show Total Income?
        // The prompt specifically says "Total Spent". I'll stick to calculating expenses,
        // but maybe I should respect the filter if it's "all" or "expense".
      }

      // Let's get all matching transactions to calculate stats
      // Warning: This could be heavy if there are thousands.
      // Ideally we use a database function or summary query.
      // For now, fetching 'amount, created_at' is lighter.

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        setStats({ totalSpent: 0, dailyAverage: 0 });
        return;
      }

      const total = data.reduce((sum, t) => sum + t.amount, 0);

      // Calculate daily average
      // Find range of dates
      const dates = data.map((t) => new Date(t.created_at).getTime());
      const minDate = Math.min(...dates);
      const maxDate = Math.max(...dates); // or now?

      // If only one day or less, avg = total
      const diffDays = Math.max(
        1,
        Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)),
      );
      const avg = total / diffDays;

      setStats({
        totalSpent: total,
        dailyAverage: avg,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, [session?.user?.id, debouncedSearch, filterType]);

  // Initial fetch and refetch on filter change
  useEffect(() => {
    fetchTransactions(0, true);
    fetchStats();
  }, [fetchTransactions, fetchStats]); // Dependencies are stable or handled inside

  const fetchNextPage = () => {
    if (!hasNextPage || isFetchingNextPage) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTransactions(nextPage, false);
  };

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};

    transactions.forEach((transaction) => {
      const date = new Date(transaction.created_at);
      let dateKey = format(date, "yyyy-MM-dd");

      if (isToday(date)) dateKey = "Today";
      else if (isYesterday(date)) dateKey = "Yesterday";
      else dateKey = format(date, "MMM d, yyyy");

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(transaction);
    });

    return groups;
  }, [transactions]);

  return {
    transactions,
    groupedTransactions,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    stats,
    refetch: () => {
      setPage(0);
      fetchTransactions(0, true);
      fetchStats();
    },
  };
};
