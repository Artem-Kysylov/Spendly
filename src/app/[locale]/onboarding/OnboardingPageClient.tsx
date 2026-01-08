"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { UserAuth } from "@/context/AuthContext";
import ChatOnboarding from "@/components/onboarding/ChatOnboarding";

export default function OnboardingPageClient() {
  const { session, isReady } = UserAuth();
  const router = useRouter();

  useEffect(() => {
    if (isReady && session?.user?.user_metadata?.onboarding_completed) {
      router.replace("/dashboard");
    }
  }, [isReady, session, router]);

  return (
    <div className="light min-h-screen bg-white">
      <ChatOnboarding />
    </div>
  );
}
