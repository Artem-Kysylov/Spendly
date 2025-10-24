
import AuthPageClient from './AuthPageClient'

export default function Page() {
  return <AuthPageClient />
}

export async function generateMetadata(): Promise<import('next').Metadata> {
  const [{ cookies }, { DEFAULT_LOCALE, isSupportedLanguage }, { getTranslations }] = await Promise.all([
    import('next/headers'),
    import('@/i18n/config'),
    import('next-intl/server')
  ])
  const cookieLocale = cookies().get('NEXT_LOCALE')?.value || cookies().get('spendly_locale')?.value || DEFAULT_LOCALE
  const locale = isSupportedLanguage(cookieLocale || '') ? (cookieLocale as any) : DEFAULT_LOCALE
  const t = await getTranslations({ locale, namespace: 'pages.auth.home.meta' })
  return { title: t('title'), description: t('description') }
}