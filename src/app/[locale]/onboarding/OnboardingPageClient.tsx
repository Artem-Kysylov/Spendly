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
    <div
      className="auth-light min-h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/Sign up screen-bg.png')" }}
    >
      <div className="container mx-auto min-h-screen p-0">
        <ChatOnboarding />
      </div>
    </div>
  );
}
