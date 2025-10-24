// Imports 
import NotFoundClient from './NotFoundClient'

export default function NotFound() {
  return <NotFoundClient />
}

export async function generateMetadata(): Promise<import('next').Metadata> {
  const [{ cookies }, { DEFAULT_LOCALE, isSupportedLanguage }, { getTranslations }] = await Promise.all([
    import('next/headers'),
    import('@/i18n/config'),
    import('next-intl/server')
  ])
  const cookieLocale = cookies().get('NEXT_LOCALE')?.value || cookies().get('spendly_locale')?.value || DEFAULT_LOCALE
  const locale = isSupportedLanguage(cookieLocale || '') ? (cookieLocale as any) : DEFAULT_LOCALE
  const t = await getTranslations({ locale, namespace: 'pages.notFound.meta' })
  return { title: t('title'), description: t('description') }
}