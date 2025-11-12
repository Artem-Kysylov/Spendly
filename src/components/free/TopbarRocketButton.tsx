'use client'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/routing'
import { RocketIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function TopbarRocketButton() {
    const t = useTranslations('layout.upgradeBanner')

    return (
        <Link href="/payment" aria-label={t('cta')} title={t('cta')}>
            <Button
                variant="ghost"
                size="icon"
                className="relative h-11 w-11 rounded-full border-2 border-primary text-primary bg-card hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
                <RocketIcon className="h-5 w-5" />
                <span className="pointer-events-none absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground shadow-sm">
                    PRO
                </span>
            </Button>
        </Link>
    )
}
export default TopbarRocketButton