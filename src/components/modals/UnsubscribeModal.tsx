import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import Button from '@/components/ui-elements/Button'
import { useTranslations } from 'next-intl'

interface UnsubscribeModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  isLoading?: boolean
}

export default function UnsubscribeModal({ open, onClose, onConfirm, isLoading }: UnsubscribeModalProps) {
  const tSettings = useTranslations('userSettings')
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="border">
        <DialogHeader>
          <DialogTitle className="text-secondary-black dark:text-white">
            {tSettings('dangerZone.modal.title')}
          </DialogTitle>
        </DialogHeader>
        <p className="py-4 text-secondary-black dark:text-gray-300">
          😢 {tSettings('dangerZone.description')}
        </p>
        <DialogFooter>
          <div className="flex gap-2">
            <Button text={tSettings('dangerZone.modal.cancel')} variant="ghost" onClick={onClose} />
            <Button text={tSettings('dangerZone.modal.confirm')} variant="destructive" onClick={onConfirm} isLoading={isLoading} />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}