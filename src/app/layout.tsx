import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isSupportedLanguage } from "@/i18n/config";
import { Montserrat } from "next/font/google";
const montserrat = Montserrat({
  subsets: ["latin", "cyrillic", "latin-ext", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const paddleEnv = (
    process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || process.env.PADDLE_ENVIRONMENT || ""
  ).trim();
  const paddleToken = (
    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || process.env.NEXT_PUBLIC_PADDLE_TOKEN || ""
  ).trim();

  const cookieLocale =
    cookies().get("NEXT_LOCALE")?.value ||
    cookies().get("spendly_locale")?.value ||
    DEFAULT_LOCALE;

  const lang = isSupportedLanguage(cookieLocale || "")
    ? (cookieLocale as string)
    : DEFAULT_LOCALE;

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#09090b" />
        {/* iOS PWA + safe-area */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-dark.png" />
        <script src="https://cdn.paddle.com/paddle/v2/paddle.js"></script>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try { const __paddleEnv = "' +
              paddleEnv +
              '"; const __paddleToken = "' +
              paddleToken +
              '"; const __tokenTrimmed = String(__paddleToken || "").trim(); const __tokenMasked = __tokenTrimmed ? (__tokenTrimmed.slice(0, 6) + "…" + __tokenTrimmed.slice(-4)) : ""; const __looksLikeClientToken = /^(test|live)_[a-zA-Z0-9]{27}$/.test(__tokenTrimmed); const __env = String(__paddleEnv || "").trim().toLowerCase(); const __normalizedEnv = (__env === "sandbox") ? "sandbox" : ((__env === "production" || __env === "live" || __env === "prod") ? "production" : ""); console.log("Paddle Init:", { env: __paddleEnv, normalizedEnv: __normalizedEnv || "(auto)", token: __tokenMasked, looksLikeClientToken: __looksLikeClientToken }); const __doInit = () => { if (!__tokenTrimmed) { console.warn("Missing Paddle client token"); return true; } if (typeof Paddle === "undefined" || !Paddle || typeof Paddle.Initialize !== "function") return false; const initArgs = { token: __tokenTrimmed }; if (__normalizedEnv) initArgs.environment = __normalizedEnv; Paddle.Initialize(initArgs); console.log("Paddle Init: initialized", { normalizedEnv: __normalizedEnv || "(auto)", token: __tokenMasked }); return true; }; if (!__doInit()) { let __tries = 0; const __max = 50; const __timer = setInterval(() => { __tries++; const ok = __doInit(); if (ok || __tries >= __max) { clearInterval(__timer); if (!ok) console.warn("Paddle Init: Paddle not available, init skipped"); } }, 100); } } catch (e) {}',
          }}
        />
      </head>
      <body className={`${montserrat.className} min-h-[100dvh]`}>
        {children}
      </body>
    </html>
  );
}
