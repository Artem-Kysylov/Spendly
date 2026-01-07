import { useEffect, useState } from "react";
import { UserAuth } from "../context/AuthContext";

export type SubscriptionPlan = "free" | "pro";

export const useSubscription = () => {
  const { session } = UserAuth();
  const [dbIsPro, setDbIsPro] = useState<boolean | null>(null);

  useEffect(() => {
    const userId = session?.user?.id;
    const token = session?.access_token;
    if (!userId) {
      setDbIsPro(null);
      return;
    }
    if (!token) {
      setDbIsPro(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const res = await fetch("/api/subscription-status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (cancelled) return;
      if (!res.ok) {
        setDbIsPro(false);
        return;
      }

      const json = (await res.json().catch(() => null)) as
        | { is_pro?: boolean; subscription_status?: string }
        | null;
      setDbIsPro(json?.is_pro === true);
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, session?.user?.id]);

  const subscriptionPlan: SubscriptionPlan =
    dbIsPro === true ? "pro" : "free";

  return { subscriptionPlan };
};
