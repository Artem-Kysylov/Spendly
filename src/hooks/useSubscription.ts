import { useEffect, useState } from "react";
import { UserAuth } from "../context/AuthContext";

export type SubscriptionPlan = "free" | "pro";

export const useSubscription = () => {
  const { session } = UserAuth();
  const [dbIsPro, setDbIsPro] = useState<boolean | null>(null);
  const [paddleCustomerId, setPaddleCustomerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const userId = session?.user?.id;
    const token = session?.access_token;
    if (!userId) {
      setDbIsPro(null);
      setPaddleCustomerId(null);
      setIsLoading(false);
      return;
    }
    if (!token) {
      setDbIsPro(false);
      setPaddleCustomerId(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const res = await fetch("/api/subscription-status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (cancelled) return;
      if (!res.ok) {
        setDbIsPro(false);
        setPaddleCustomerId(null);
        setIsLoading(false);
        return;
      }

      const json = (await res.json().catch(() => null)) as
        | { is_pro?: boolean; subscription_status?: string; paddle_customer_id?: string | null }
        | null;
      setDbIsPro(json?.is_pro === true);
      setPaddleCustomerId(
        typeof json?.paddle_customer_id === "string" && json.paddle_customer_id.length > 0
          ? json.paddle_customer_id
          : null,
      );
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, session?.user?.id]);

  const subscriptionPlan: SubscriptionPlan =
    dbIsPro === true ? "pro" : "free";

  const isStatusUnknown =
    typeof session?.user?.id === "string" &&
    session.user.id.length > 0 &&
    typeof session?.access_token === "string" &&
    session.access_token.length > 0 &&
    dbIsPro === null;

  const isLoadingEffective = isLoading || isStatusUnknown;

  return { subscriptionPlan, isLoading: isLoadingEffective, paddleCustomerId };
};
