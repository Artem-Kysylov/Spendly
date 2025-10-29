import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, isSupportedLanguage } from '@/i18n/config'

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
      <body>{children}</body>
    </html>
  )
}