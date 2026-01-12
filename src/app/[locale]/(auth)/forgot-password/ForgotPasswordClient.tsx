"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "@/i18n/routing";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Button from "@/components/ui-elements/Button";

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"form" | "success">("form");
  const locale = useLocale();
  const tForgot = useTranslations("forgotPassword");

  useEffect(() => {
    const el = document.documentElement;
    const prev = el.getAttribute("data-force-theme");
    el.setAttribute("data-force-theme", "light");
    return () => {
      if (prev === null) el.removeAttribute("data-force-theme");
      else el.setAttribute("data-force-theme", prev);
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const isValid = /\S+@\S+\.\S+/.test(email);
    if (!isValid) {
      setError(tForgot("error.invalidEmail"));
      return;
    }

    try {
      setIsSubmitting(true);
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/${locale}/reset-password`,
      });
      setStage("success");
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
              {tForgot("title")}
            </motion.h1>

            {stage === "form" && (
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <p className="text-sm text-gray-600">
                  {tForgot("instructions")}
                </p>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-medium"
                  >
                    {tForgot("label.email")}
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder={tForgot("placeholder.email")}
                  />
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
                      ? tForgot("states.sending")
                      : tForgot("buttons.sendReset")
                  }
                  disabled={isSubmitting}
                />

                <div className="text-center">
                  <Link
                    href={{ pathname: "/" }}
                    className="text-blue-600 hover:text-blue-700 underline text-sm"
                  >
                    {tForgot("buttons.backToSignIn")}
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
                  {tForgot("success.title")}
                </motion.h2>
                <p className="text-sm text-gray-600">
                  {tForgot("success.description")}
                </p>
                <Link
                  href={{ pathname: "/" }}
                  className="text-blue-600 hover:text-blue-700 underline text-sm"
                >
                  {tForgot("buttons.backToSignIn")}
                </Link>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
