"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { UserAuth } from "@/context/AuthContext";
import Button from "@/components/ui-elements/Button";
import ToastMessage from "@/components/ui-elements/ToastMessage";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
// Removed duplicate import of UserAuth
import { useSignWithGoogle } from "@/hooks/useSignWithGoogle";
import { Link } from "@/i18n/routing";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { AvatarUpload } from "@/components/ui-elements";
import { useSearchParams, useRouter as useNextRouter } from "next/navigation";

export default function AuthPageClient() {
  const {
    session,
    isReady,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    isSigningIn,
    isSigningUp,
  } = UserAuth();
  const router = useRouter();
  const nextRouter = useNextRouter();
  const tAuth = useTranslations("auth");
  const searchParams = useSearchParams();
  const initialTab =
    searchParams?.get("tab") === "signup" ? "signup" : "signin";

  const safeRedirectTo = useMemo(() => {
    const raw = searchParams?.get("redirectTo");
    if (!raw) return null;
    if (!raw.startsWith("/") || raw.startsWith("//")) return null;
    const authPathPattern = /^\/([a-z]{2})?\/?auth(\/|\?|$)/i;
    if (authPathPattern.test(raw)) return null;
    return raw;
  }, [searchParams]);

  useEffect(() => {
    try {
      const plan = searchParams?.get("plan");
      if (plan) localStorage.setItem("auth:pendingPlan", plan);
    } catch {}
  }, [searchParams]);

  useEffect(() => {
    if (isReady && session && session.user && router) {
      let storedPlan: string | null = null;
      try {
        storedPlan = localStorage.getItem("auth:pendingPlan");
      } catch {}

      if (storedPlan) {
        try {
          localStorage.removeItem("auth:pendingPlan");
        } catch {}

        if (safeRedirectTo?.startsWith("/paywall")) {
          const url = new URL(safeRedirectTo, window.location.origin);
          const query: Record<string, string> = {};
          url.searchParams.forEach((value, key) => {
            query[key] = value;
          });
          if (!query.plan) query.plan = storedPlan;
          router.replace({ pathname: "/paywall", query });
          return;
        }

        router.replace({ pathname: "/paywall", query: { plan: storedPlan } });
        return;
      }

      if (safeRedirectTo) {
        nextRouter.replace(safeRedirectTo);
        return;
      }
      const completed = !!session.user?.user_metadata?.onboarding_completed;
      router.replace(completed ? "/dashboard" : "/onboarding");
    }
  }, [isReady, nextRouter, router, safeRedirectTo, session]);

  const [activeTab, setActiveTab] = useState<"signin" | "signup">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [signupAvatarBlob, setSignupAvatarBlob] = useState<Blob | null>(null);
  const [signupAvatarPreview, setSignupAvatarPreview] = useState<string | null>(
    null,
  );
  const [signupUploadedAvatarUrl, setSignupUploadedAvatarUrl] = useState<
    string | null
  >(null);

  const generateInitialAvatar = async (seedText: string): Promise<Blob> => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    const isDark = document.documentElement.classList.contains("dark");
    const brandColor = isDark ? "#818CF8" : "#4F46E5";
    const letter = (seedText?.trim()?.charAt(0) || "S").toUpperCase();

    ctx.fillStyle = brandColor;
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font =
      "bold 120px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText(letter, 128, 128);

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (!b) return reject(new Error("Failed to create avatar blob"));
          resolve(b);
        },
        "image/webp",
        0.9,
      );
    });
    return blob;
  };

  const showError = (text: string) => {
    setToast({ text, type: "error" });
    setTimeout(() => setToast(null), 3000);
  };

  const pwdCheck = useMemo(() => {
    const len = password.length >= 6;
    const lower = /[a-z]/.test(password);
    const upper = /[A-Z]/.test(password);
    const digit = /\d/.test(password);
    const symbol = /[^A-Za-z0-9]/.test(password);
    return {
      len,
      lower,
      upper,
      digit,
      symbol,
      all: len && lower && upper && digit && symbol,
    };
  }, [password]);

  const onGoogle = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      showError(error.message || "Google sign-in failed");
      return;
    }
  };

  const onEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await signInWithPassword(email, password);
    if (error) {
      showError(error.message || "Invalid credentials");
      return;
    }
    if (rememberMe) {
      localStorage.setItem("auth:rememberMe", "1");
      localStorage.setItem("auth:rememberedEmail", email);
    } else {
      localStorage.removeItem("auth:rememberMe");
      localStorage.removeItem("auth:rememberedEmail");
    }

    if (safeRedirectTo) {
      nextRouter.replace(safeRedirectTo);
      return;
    }

    let completed = !!data?.user?.user_metadata?.onboarding_completed;
    if (completed === false && !data?.user) {
      const { data: userData } = await supabase.auth.getUser();
      completed = !!userData?.user?.user_metadata?.onboarding_completed;
    }
    router.replace(completed ? "/dashboard" : "/onboarding");
  };

  const onEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdCheck.all) return;

    const { data, error } = await signUpWithPassword(email, password);
    if (error) {
      showError(error.message || "Sign up failed");
      return;
    }

    try {
      let avatarBlob: Blob | null = signupAvatarBlob;
      if (!avatarBlob) {
        avatarBlob = await generateInitialAvatar(email);
      }
      if (avatarBlob) {
        let userId = data?.user?.id ?? null;
        if (!userId) {
          const { data: userData } = await supabase.auth.getUser();
          userId = userData?.user?.id ?? null;
        }
        if (userId) {
          const ext = avatarBlob.type === "image/webp" ? "webp" : "jpg";
          const fileName = `${userId}-${Date.now()}.${ext}`;
          const filePath = `avatars/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("user-avatars")
            .upload(filePath, avatarBlob, {
              contentType: avatarBlob.type,
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            showError(uploadError.message || "Failed to upload avatar");
          } else {
            const { data: urlData } = supabase.storage
              .from("user-avatars")
              .getPublicUrl(filePath);

            const publicUrl = urlData.publicUrl;
            setSignupUploadedAvatarUrl(publicUrl);

            const { error: updateError } = await supabase.auth.updateUser({
              data: { avatar_url: publicUrl },
            });
            if (updateError) {
              showError(
                updateError.message || "Failed to save avatar to profile",
              );
            }
          }
        }
      }
    } catch (err: any) {
      showError(err?.message || "Failed to process avatar upload");
    }

    if (rememberMe) {
      localStorage.setItem("auth:rememberMe", "1");
      localStorage.setItem("auth:rememberedEmail", email);
    }

    if (safeRedirectTo) {
      nextRouter.replace(safeRedirectTo);
      return;
    }

    router.replace("/onboarding");
  };

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    const remembered = localStorage.getItem("auth:rememberMe") === "1";
    const savedEmail = localStorage.getItem("auth:rememberedEmail") || "";
    if (remembered && savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  if (!isReady) return null;
  if (session) return null;

  return (
    <div
      className="auth-light min-h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/Sign up screen-bg.png')" }}
    >
      <motion.div
        className="container mx-auto flex min-h-screen items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.div
          className="w-full max-w-md rounded-[10px] border border-gray-200 bg-white text-gray-900 shadow-sm dark:bg白 dark:text-gray-900"
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
              />
            </motion.div>

            <motion.h1
              className="mt-6 mb-4 text-xl sm:text-2xl font-semibold text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            >
              {activeTab === "signin"
                ? tAuth("tabs.signin")
                : tAuth("tabs.signup")}
            </motion.h1>

            <div className="w-full max-w-md space-y-6">
              <Button
                variant="outline"
                className="w-full bg-white text-black border border-gray-300 hover:bg-gray-50"
                text={tAuth("buttons.google")}
                icon={
                  <Image
                    src="/google.svg"
                    alt="Google"
                    width={20}
                    height={20}
                  />
                }
                onClick={onGoogle}
              />

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-300" />
                <span className="text-xs text-gray-500 uppercase tracking-wide">
                  or
                </span>
                <div className="h-px flex-1 bg-gray-300" />
              </div>

              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "signin" | "signup")}
                className="mt-6"
              >
                <div className="flex justify-center">
                  <TabsList>
                    <TabsTrigger value="signin">
                      {tAuth("tabs.signin")}
                    </TabsTrigger>
                    <TabsTrigger value="signup">
                      {tAuth("tabs.signup")}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="signin">
                  <form onSubmit={onEmailSignIn} className="space-y-3">
                    <Input
                      type="email"
                      placeholder="Email"
                      className="h-[50px] px-[20px]"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <div className="relative">
                      <Input
                        type={showPwd ? "text" : "password"}
                        placeholder="Password"
                        className="h-[50px] px-[20px] pr-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-900"
                        aria-label={showPwd ? "Hide password" : "Show password"}
                      >
                        {showPwd ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="inline-flex items-center gap-2">
                        <Checkbox
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <span className="text-sm text-secondary-black">
                          {tAuth("labels.rememberMe")}
                        </span>
                      </label>

                      <Link
                        href={{ pathname: "/forgot-password" }}
                        className="text-blue-600 hover:text-blue-700 underline text-sm"
                      >
                        Forgot your password?
                      </Link>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full"
                      text={isSigningIn ? "Signing in..." : "Sign in"}
                      disabled={isSigningIn}
                    />
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={onEmailSignUp} className="space-y-3">
                    <Input
                      type="email"
                      placeholder="Email"
                      className="h-[50px] px-[20px]"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <div className="relative">
                      <Input
                        type={showPwd ? "text" : "password"}
                        placeholder="Password"
                        className="h-[50px] px-[20px] pr-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-900"
                        aria-label={showPwd ? "Hide password" : "Show password"}
                      >
                        {showPwd ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    <div className="flex justify-center py-2">
                      <AvatarUpload
                        mode="pre-signup"
                        showRemoveButton
                        onProcessed={({ blob, previewUrl }) => {
                          setSignupAvatarBlob(blob);
                          setSignupAvatarPreview(previewUrl);
                        }}
                        onClear={() => {
                          setSignupAvatarBlob(null);
                          setSignupAvatarPreview(null);
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      Accepted: image files up to 5MB. Square crop to 256×256.
                      WebP/JPEG.
                    </p>

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full"
                      text={isSigningUp ? "Creating account..." : "Sign up"}
                      disabled={!pwdCheck.all || isSigningUp}
                    />
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
