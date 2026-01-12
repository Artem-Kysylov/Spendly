"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { UserAuth } from "@/context/AuthContext";
import ChatOnboarding from "@/components/onboarding/ChatOnboarding";

export default function OnboardingPageClient() {
  const { session, isReady } = UserAuth();
  const router = useRouter();

  useEffect(() => {
    const el = document.documentElement;
    const prev = el.getAttribute("data-force-theme");
    el.setAttribute("data-force-theme", "light");
    return () => {
      if (prev === null) el.removeAttribute("data-force-theme");
      else el.setAttribute("data-force-theme", prev);
    };
  }, []);

  useEffect(() => {
    if (isReady && session?.user?.user_metadata?.onboarding_completed) {
      router.replace("/dashboard");
    }
  }, [isReady, session, router]);

  return (
    <div className="min-h-screen">
      <ChatOnboarding />
    </div>
  );
}
