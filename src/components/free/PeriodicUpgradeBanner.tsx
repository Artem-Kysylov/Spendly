import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/routing'
import { useState } from 'react'

export default function PeriodicUpgradeBanner() {
  const t = useTranslations('layout')
  const [visible, setVisible] = useState(true)

  if (!visible) return null

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
        <Link href="/payment">
          <Button size="sm">{t('upgradeBanner.cta')}</Button>
        </Link>
      </div>
    </div>
  )
}