import { UserAuth } from '../context/AuthContext';

export type SubscriptionPlan = 'free' | 'pro';

export const useSubscription = () => {
  const { session } = UserAuth();

  const subscriptionPlan: SubscriptionPlan = session?.user?.user_metadata?.subscription_status === 'pro' ? 'pro' : 'free';

  return { subscriptionPlan };
};