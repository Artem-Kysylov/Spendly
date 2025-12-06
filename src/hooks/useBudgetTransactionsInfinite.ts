import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { UserAuth } from "@/context/AuthContext";
import { Transaction } from "@/types/types";
import { format, isToday, isYesterday } from "date-fns";

const ITEMS_PER_PAGE = 20;

interface UseBudgetTransactionsInfiniteProps {
    budgetId: string;
}

export const useBudgetTransactionsInfinite = ({
    budgetId,
}: UseBudgetTransactionsInfiniteProps) => {
    const { session } = UserAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
    const [hasNextPage, setHasNextPage] = useState(true);

    // Pagination state
    const [page, setPage] = useState(0);

    const fetchTransactions = useCallback(
        async (pageIndex: number, isNew: boolean) => {
            if (!session?.user?.id || !budgetId) return;

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
                    .eq("budget_folder_id", budgetId)
                    .order("created_at", { ascending: false });

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
                console.error("Error fetching budget transactions:", err);
            } finally {
                setIsLoading(false);
                setIsFetchingNextPage(false);
            }
        },
        [session?.user?.id, budgetId],
    );

    // Initial fetch
    useEffect(() => {
        setPage(0);
        setTransactions([]);
        setHasNextPage(true);
        fetchTransactions(0, true);
    }, [fetchTransactions]);

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
        refetch: () => {
            setPage(0);
            setTransactions([]);
            setHasNextPage(true);
            fetchTransactions(0, true);
        },
    };
};
