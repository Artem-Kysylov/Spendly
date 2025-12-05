"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { UserAuth } from "@/context/AuthContext";
import Onboarding from "@/components/onboarding/Onboarding";

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
      <div className="container mx-auto flex min-h-screen items-center justify-center p-4">
        <Onboarding />
      </div>
    </div>
  );
}
