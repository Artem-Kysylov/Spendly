import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/routing'

export default function UpgradeSidebarBanner() {
  const t = useTranslations('layout')

  return (
    <div className="rounded-lg border border-primary/30 bg-card p-3">
      <h4 className="text-sm font-semibold">
        {t('upgradeBanner.title')}
      </h4>
      <p className="mt-1 text-xs text-muted-foreground">
        {t('upgradeBanner.description')}
      </p>
      <Link href="/payment">
        <Button size="sm" className="mt-2 w-full">
          {t('upgradeBanner.cta')}
        </Button>
      </Link>
    </div>
  )
}