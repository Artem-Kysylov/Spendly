"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import Button from "@/components/ui-elements/Button";
import { CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";

export default function ResetPasswordClient() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitializingSession, setIsInitializingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"form" | "success">("form");

  const router = useRouter();
  const tReset = useTranslations("resetPassword");

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
    let cancelled = false;

    const initSessionFromUrl = async () => {
      try {
        const currentUrl = new URL(window.location.href);

        // If Supabase redirected back with an error in hash, show it.
        const hashParamsForError = new URLSearchParams(
          currentUrl.hash.replace(/^#/, ""),
        );
        const supaErrorDesc = hashParamsForError.get("error_description");
        const supaErrorCode = hashParamsForError.get("error_code");
        if (supaErrorDesc || supaErrorCode) {
          if (!cancelled) {
            setError(
              supaErrorDesc
                ? decodeURIComponent(supaErrorDesc.replace(/\+/g, " "))
                : "Invalid or expired reset link",
            );
          }
          return;
        }

        // If session is already present (e.g. from previous init), don't show any link errors.
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          if (!cancelled) setError(null);
          return;
        }

        const code = currentUrl.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!cancelled && error) setError(error.message);
          if (!cancelled) {
            currentUrl.searchParams.delete("code");
            currentUrl.hash = "";
            window.history.replaceState(
              null,
              "",
              currentUrl.pathname + currentUrl.search,
            );
          }
          return;
        }

        const queryAccessToken = currentUrl.searchParams.get("access_token");
        const queryRefreshToken = currentUrl.searchParams.get("refresh_token");

        const hashParams = new URLSearchParams(
          currentUrl.hash.replace(/^#/, ""),
        );
        const hashAccessToken = hashParams.get("access_token");
        const hashRefreshToken = hashParams.get("refresh_token");

        const accessToken = queryAccessToken ?? hashAccessToken;
        const refreshToken = queryRefreshToken ?? hashRefreshToken;

        if (!accessToken || !refreshToken) return;

        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!cancelled && error) setError(error.message);

        if (!cancelled) {
          currentUrl.hash = "";
          currentUrl.searchParams.delete("access_token");
          currentUrl.searchParams.delete("refresh_token");
          currentUrl.searchParams.delete("expires_in");
          currentUrl.searchParams.delete("token_type");
          currentUrl.searchParams.delete("type");
          window.history.replaceState(
            null,
            "",
            currentUrl.pathname + currentUrl.search,
          );

          // Clear any previous errors once session is established.
          setError(null);
        }
      } finally {
        if (!cancelled) setIsInitializingSession(false);
      }
    };

    setIsInitializingSession(true);
    void initSessionFromUrl();

    return () => {
      cancelled = true;
    };
  }, []);

  const validatePassword = (pwd: string) => ({
    len: pwd.length >= 6,
    lower: /[a-z]/.test(pwd),
    upper: /[A-Z]/.test(pwd),
    digit: /\d/.test(pwd),
    symbol: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
  });

  const pwdCheck = validatePassword(password);
  const isPasswordValid = Object.values(pwdCheck).every(Boolean);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isInitializingSession) {
      setError("Please wait a moment and try again");
      return;
    }
    if (!isPasswordValid) {
      setError("Password does not meet requirements");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }
      setStage("success");
      // Security/UX: after password reset, return user to sign-in screen.
      try {
        await supabase.auth.signOut();
      } catch {}
      setTimeout(
        () => router.replace({ pathname: "/auth", query: { tab: "signin" } }),
        1200,
      );
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong, please try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/Sign up screen-bg.png')" }}
    >
      <motion.div
        className="container mx-auto flex min-h-screen items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.div
          className="w-full max-w-md rounded-[10px] border border-gray-200 bg-white text-gray-900 shadow-sm dark:bg-white dark:text-gray-900"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        >
          <div className="p-6 sm:p-8">
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            >
              <Image
                src="/Spendly-logo.svg"
                alt="Spendly"
                width={120}
                height={32}
                priority
              />
            </motion.div>

            <motion.h1
              className="mt-6 mb-4 text-xl sm:text-2xl font-semibold text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            >
              {tReset("title")}
            </motion.h1>

            {stage === "form" && (
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <p className="text-sm text-gray-600">
                  {tReset("instructions")}
                </p>
                <div>
                  <label
                    htmlFor="password"
                    className="mb-1 block text-sm font-medium"
                  >
                    {tReset("label.password")}
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder={tReset("placeholder.password")}
                      className="pr-10"
                    />
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div
                    className={`flex items-center gap-2 ${pwdCheck.len ? "text-green-600" : "text-gray-400"}`}
                  >
                    <span>{pwdCheck.len ? "✓" : "○"}</span>
                    <span>{tReset("requirements.minimumChars")}</span>
                  </div>
                  <div
                    className={`flex items-center gap-2 ${pwdCheck.lower ? "text-green-600" : "text-gray-400"}`}
                  >
                    <span>{pwdCheck.lower ? "✓" : "○"}</span>
                    <span>{tReset("requirements.lowercase")}</span>
                  </div>
                  <div
                    className={`flex items-center gap-2 ${pwdCheck.upper ? "text-green-600" : "text-gray-400"}`}
                  >
                    <span>{pwdCheck.upper ? "✓" : "○"}</span>
                    <span>{tReset("requirements.uppercase")}</span>
                  </div>
                  <div
                    className={`flex items-center gap-2 ${pwdCheck.digit ? "text-green-600" : "text-gray-400"}`}
                  >
                    <span>{pwdCheck.digit ? "✓" : "○"}</span>
                    <span>{tReset("requirements.number")}</span>
                  </div>
                  <div
                    className={`flex items-center gap-2 ${pwdCheck.symbol ? "text-green-600" : "text-gray-400"}`}
                  >
                    <span>{pwdCheck.symbol ? "✓" : "○"}</span>
                    <span>{tReset("requirements.special")}</span>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-1 block text-sm font-medium"
                  >
                    {tReset("label.confirmPassword")}
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder={tReset("placeholder.confirmPassword")}
                      className="pr-10"
                    />
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="text-sm text-red-600"
                  >
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  text={
                    isSubmitting
                      ? tReset("states.updating")
                      : tReset("buttons.update")
                  }
                  disabled={
                    !isPasswordValid ||
                    password !== confirmPassword ||
                    isSubmitting
                  }
                />

                <div className="text-center">
                  <Link
                    href={{ pathname: "/" }}
                    className="text-blue-600 hover:text-blue-700 underline text-sm"
                  >
                    {tReset("buttons.backToSignIn")}
                  </Link>
                </div>
              </form>
            )}

            {stage === "success" && (
              <motion.div
                className="flex flex-col items-center text-center space-y-4"
                aria-live="polite"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <CheckCircle2
                  className="h-14 w-14 text-emerald-500"
                  aria-hidden="true"
                />
                <motion.h2
                  className="text-xl font-semibold"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                >
                  Password updated!
                </motion.h2>
                <p className="text-sm text-gray-600">
                  {tReset("success.description")}
                </p>
                <Link
                  href="/"
                  className="text-blue-600 hover:text-blue-700 underline text-sm"
                >
                  {tReset("buttons.backToSignIn")}
                </Link>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
