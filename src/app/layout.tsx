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
              'try { if (typeof Paddle !== "undefined" && Paddle && typeof Paddle.Initialize === "function") { Paddle.Initialize({ token: "' +
              (process.env.NEXT_PUBLIC_PADDLE_TOKEN ||
                "live_23bd232d227c212d3901ff2e1da") +
              '" }); } } catch (e) {}',
          }}
        />
      </head>
      <body className={`${montserrat.className} min-h-[100dvh]`}>
        {children}
      </body>
    </html>
  );
}
