'use client'

import Button from '@/components/ui-elements/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { CheckCircle2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

type AppInstallModalProps = {
  isOpen: boolean
  onClose: () => void
}

const benefits = [
  'Offline access',
  'Push notifications',
  'Faster startup',
  'Feels native',
  'Add to Home Screen',
]

const AppInstallModal = ({ isOpen, onClose }: AppInstallModalProps) => {
  const tModals = useTranslations('modals')
  const tCommon = useTranslations('common')
  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">{tModals('appInstall.title')}</DialogTitle>
          <DialogClose className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X size={22} /></DialogClose>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <ul className="space-y-3">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-secondary-black dark:text-white">{b}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Install via your browser’s “Add to Home Screen” or “Install app” menu.
          </p>
        </div>

        <DialogFooter className="justify-center sm:justify-center">
          <Button text={tCommon('close')} variant="ghost" className="text-primary" onClick={onClose} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AppInstallModal