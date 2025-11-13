import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/routing'
import { useSubscription } from '@/hooks/useSubscription'
import { trackEvent } from '@/lib/telemetry'

export default function UpgradeSidebarBanner() {
  const t = useTranslations('layout')
  const { subscriptionPlan } = useSubscription()

  if (subscriptionPlan === 'pro') return null

  const handleUpgradeClick = () => {
    trackEvent('upgrade_cta_clicked', { from: 'sidebar_banner' })
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-card p-3">
      <h4 className="text-sm font-semibold">
        {t('upgradeBanner.title')}
      </h4>
      <p className="mt-1 text-xs text-muted-foreground">
        {t('upgradeBanner.description')}
      </p>
      <Link href="/payment" onClick={handleUpgradeClick}>
        <Button size="sm" className="mt-2 w-full">
          {t('upgradeBanner.cta')}
        </Button>
      </Link>
    </div>
  )
}