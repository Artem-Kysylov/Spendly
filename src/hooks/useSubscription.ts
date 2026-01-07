import { useEffect, useState } from "react";
import { UserAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export type SubscriptionPlan = "free" | "pro";

export const useSubscription = () => {
  const { session } = UserAuth();
  const [dbIsPro, setDbIsPro] = useState<boolean | null>(null);

  const email = (session?.user?.email || "").toLowerCase();
  const allowlist = (process.env.NEXT_PUBLIC_PREMIUM_EMAILS || "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setDbIsPro(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("users")
        .select("is_pro, subscription_status")
        .eq("id", userId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setDbIsPro(null);
        return;
      }
      const isPro =
        (data as any)?.is_pro === true || (data as any)?.subscription_status === "pro";
      setDbIsPro(isPro);
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const isProMetadata =
    session?.user?.user_metadata?.subscription_status === "pro" ||
    session?.user?.user_metadata?.isPro === true;

  const isProOverride = email && allowlist.includes(email);

  const subscriptionPlan: SubscriptionPlan =
    dbIsPro === true || isProMetadata || isProOverride ? "pro" : "free";

  return { subscriptionPlan };
};
