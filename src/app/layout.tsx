import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, isSupportedLanguage } from '@/i18n/config'
import { Montserrat } from "next/font/google";
const montserrat = Montserrat({
  subsets: ["latin", "cyrillic", "latin-ext", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieLocale =
    cookies().get('NEXT_LOCALE')?.value ||
    cookies().get('spendly_locale')?.value ||
    DEFAULT_LOCALE

  const lang = isSupportedLanguage(cookieLocale || '') ? (cookieLocale as string) : DEFAULT_LOCALE

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className={montserrat.className}>{children}</body>
    </html>
  )
}