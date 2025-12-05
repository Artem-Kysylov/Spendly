import { UserAuth } from "../context/AuthContext";

export type SubscriptionPlan = "free" | "pro";

export const useSubscription = () => {
  const { session } = UserAuth();

  const email = (session?.user?.email || "").toLowerCase();
  const allowlist = (process.env.NEXT_PUBLIC_PREMIUM_EMAILS || "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const isProMetadata =
    session?.user?.user_metadata?.subscription_status === "pro" ||
    session?.user?.user_metadata?.isPro === true;

  const isProOverride = email && allowlist.includes(email);

  const subscriptionPlan: SubscriptionPlan =
    isProMetadata || isProOverride ? "pro" : "free";

  return { subscriptionPlan };
};
