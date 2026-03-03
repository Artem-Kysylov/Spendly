"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { UserAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import useDeviceType from "@/hooks/useDeviceType";

interface Shortcut {
  title: string;
  amount: number;
}

interface TransactionShortcutsProps {
  onSelectShortcut: (text: string) => void;
  currency: string;
}

export function TransactionShortcuts({
  onSelectShortcut,
  currency,
}: TransactionShortcutsProps) {
  const { session } = UserAuth();
  const t = useTranslations("chat.shortcuts");
  const { isMobile } = useDeviceType();
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const paddingY = isMobile ? "py-[15px]" : "py-2.5";

  // Default shortcuts with localized titles
  const getDefaultShortcuts = (): Shortcut[] => {
    // Default amounts based on currency
    const defaultAmounts: Record<string, { coffee: number; lunch: number; taxi: number; groceries: number }> = {
      USD: { coffee: 5, lunch: 15, taxi: 10, groceries: 50 },
      EUR: { coffee: 4, lunch: 12, taxi: 8, groceries: 40 },
      UAH: { coffee: 150, lunch: 400, taxi: 250, groceries: 1500 },
      RUB: { coffee: 200, lunch: 500, taxi: 300, groceries: 2000 },
      JPY: { coffee: 500, lunch: 1500, taxi: 1000, groceries: 5000 },
      IDR: { coffee: 50000, lunch: 150000, taxi: 100000, groceries: 500000 },
      INR: { coffee: 200, lunch: 500, taxi: 300, groceries: 2000 },
      KRW: { coffee: 5000, lunch: 15000, taxi: 10000, groceries: 50000 },
    };

    const amounts = defaultAmounts[currency] || defaultAmounts.USD;

    return [
      { title: t("coffee"), amount: amounts.coffee },
      { title: t("lunch"), amount: amounts.lunch },
      { title: t("taxi"), amount: amounts.taxi },
      { title: t("groceries"), amount: amounts.groceries },
    ];
  };

  useEffect(() => {
    async function fetchShortcuts() {
      if (!session?.user?.id) {
        setShortcuts(getDefaultShortcuts());
        setIsLoading(false);
        return;
      }

      try {
        // Fetch top 4 most frequent title + amount pairs
        const { data, error } = await supabase
          .from("transactions")
          .select("title, amount")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;

        if (!data || data.length === 0) {
          setShortcuts(getDefaultShortcuts());
          setIsLoading(false);
          return;
        }

        // Count frequency of title + amount combinations
        const frequencyMap = new Map<string, { title: string; amount: number; count: number }>();

        for (const tx of data) {
          const key = `${tx.title}_${tx.amount}`;
          const existing = frequencyMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            frequencyMap.set(key, {
              title: tx.title,
              amount: tx.amount,
              count: 1,
            });
          }
        }

        // Sort by frequency and get top 4
        const sorted = Array.from(frequencyMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 4)
          .map(({ title, amount }) => ({ title, amount }));

        // If less than 4, fill with defaults
        if (sorted.length < 4) {
          const defaults = getDefaultShortcuts();
          const needed = 4 - sorted.length;
          const fillDefaults = defaults.slice(0, needed);
          setShortcuts([...sorted, ...fillDefaults]);
        } else {
          setShortcuts(sorted);
        }
      } catch (error) {
        console.error("Error fetching shortcuts:", error);
        setShortcuts(getDefaultShortcuts());
      } finally {
        setIsLoading(false);
      }
    }

    fetchShortcuts();
  }, [session?.user?.id, currency]);

  if (isLoading) {
    return null;
  }

  return (
    <div className="px-4 pb-4">
      <p className="text-xs font-medium text-muted-foreground mb-3 text-center">
        {t("title")}
      </p>
      <div className="grid grid-cols-2 gap-3 justify-items-stretch">
        {shortcuts.map((shortcut, index) => {
          const text = `${shortcut.title} ${shortcut.amount}`;
          return (
            <button
              key={index}
              onClick={() => onSelectShortcut(text)}
              className={cn(
                "w-full inline-flex items-center justify-center text-center",
                "px-4 text-xs",
                "bg-primary/10 hover:bg-primary/40 text-primary",
                "rounded-full transition-all duration-200 border border-primary touch-manipulation",
                paddingY,
              )}
            >
              {shortcut.title} {shortcut.amount} {currency}
            </button>
          );
        })}
      </div>
    </div>
  );
}
