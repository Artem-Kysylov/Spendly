import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/routing'
import { useState } from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import { trackEvent } from '@/lib/telemetry'

export default function PeriodicUpgradeBanner() {
  const t = useTranslations('layout')
  const [visible, setVisible] = useState(true)
  const { subscriptionPlan } = useSubscription()

  if (!visible || subscriptionPlan === 'pro') return null

  const handleUpgradeClick = () => {
    trackEvent('upgrade_cta_clicked', { from: 'periodic_banner' })
  }

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-5 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-xl">🚀</span>
        <div>
          <div className="text-sm font-semibold">{t('periodicBanner.title')}</div>
          <div className="text-xs text-muted-foreground">
            {t('periodicBanner.description')}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setVisible(false)}>
          {t('periodicBanner.dismiss')}
        </Button>
        <Link href="/payment" onClick={handleUpgradeClick}>
          <Button size="sm">{t('upgradeBanner.cta')}</Button>
        </Link>
      </div>
    </div>
  )
}